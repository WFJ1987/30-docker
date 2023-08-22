const net = require('net');
const exec = require('child_process').exec;
var request = require('request');
var fs = require('fs');
var path = require('path');
const os = require('os');
const { WebSocket, createWebSocketStream } = require('ws');
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);

//设置参数
const uuid = (process.env.UUID || 'a95822a7-3f84-40bf-8669-a07d74e5f272').replace(/-/g, '');
const port = process.env.PORT || 3000
const NEZHA_KEY = process.env.NEZHA_KEY || 'ZZNVjuLNbE5Ahex4ws';
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nezha.dreama.eu.org';
const ARGO_AUTH = process.env.ARGO_AUTH || 'dfafsf23r23fdsaf3242fsa4r23423f3';

//nezha保活
if (NEZHA_KEY) {
  function keep_nezha_alive() {
    if (NEZHA_KEY) {
      exec("pidof nezha-agent", function (err, stdout, stderr) {
        if (stdout) {
          console.log("");
        } else {
          // nezha 未运行，命令行调起
          exec(`chmod +x ./nezha-agent && nohup ./nezha-agent -s ${NEZHA_SERVER}:443 -p ${NEZHA_KEY} --tls >/dev/null 2>&1 &`, function (err, stdout, stderr) {
            if (err) {
              console.log("调起nezha-命令行执行错误");
            } else {
              console.log("调起nezha-命令行执行成功!");
            }
          });
        }
      });
    } else {
      console.log("");
    }
  }
  setInterval(keep_nezha_alive, 45 * 1000);
} else {
  console.log("");
}

//argo保活
if (ARGO_AUTH) {
  function keep_argo_alive() {
    if (ARGO_AUTH) {
      exec("pidof argo", function (err, stdout, stderr) {
        if (stdout) {
          console.log("");
        } else {
          // ar-go 未运行，命令行调起
          exec(`chmod +x ./argo && nohup ./argo tunnel --edge-ip-version auto run --token ${ARGO_AUTH} >/dev/null 2>&1 &`, function (err, stdout, stderr) {
            if (err) {
              console.log("调起argo-命令行执行错误");
            } else {
              console.log("调起argo-命令行执行成功!");
            }
          });
        }
      });
    } else {
      console.log("");
    }
  }
  setInterval(keep_argo_alive, 45 * 1000);
} else {
  console.log("");
}

//初始化，下载nezha
if (NEZHA_KEY) {
function download_nezha(callback) {
    let fileName = "nezha-agent";
    let nez_url;

    if (os.arch() === 'x64' || os.arch() === 'amd64') {

      nez_url = process.env.URL_NEZHA || 'https://raw.githubusercontent.com/kahunama/myfile/main/nezha/nezha-agent';
    } else {

      nez_url = process.env.URL_NEZHA2 || 'https://raw.githubusercontent.com/kahunama/myfile/main/nezha/nezha-agent(arm)';
    }

    let stream = fs.createWriteStream(path.join("./", fileName));
    request(nez_url)
      .pipe(stream)
      .on("close", function (err) {
        if (err) {
          callback("下载nezha文件失败");
        } else {
          callback(null);
        }
      });
}
download_nezha((err) => {
  if (err) {
    console.log("下载nezha文件失败");
  } else {
    console.log("下载nezha文件成功");
  }
});
} else {
    console.log("");
}

//初始化，下载argo
if (ARGO_AUTH) {
  function download_cff(callback) {
      let fileName = "argo";
      let cff_url;

      if (os.arch() === 'x64' || os.arch() === 'amd64') {

        cff_url = process.env.URL_CF || 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
      } else {

        cff_url = process.env.URL_CF2 || 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64';
      }

      let stream = fs.createWriteStream(path.join("./", fileName));
      request(cff_url)
        .pipe(stream)
        .on("close", function (err) {
          if (err) {
            callback("下载argo文件失败");
          } else {
            callback(null);
          }
        });
  }
  download_cff((err) => {
    if (err) {
      console.log("下载argo文件失败");
    } else {
      console.log("下载argo文件成功");
    }
  });
  } else {
      console.log("");
  }

//30
const wss=new WebSocket.Server({port},logcb('listen:', port));
wss.on('connection', ws=>{
  ws.once('message', msg=>{
    const [VERSION]=msg;
    const id=msg.slice(1, 17);
    if(!id.every((v,i)=>v==parseInt(uuid.substr(i*2,2),16))) return;
    let i = msg.slice(17, 18).readUInt8()+19;
    const port = msg.slice(i, i+=2).readUInt16BE(0);
    const ATYP = msg.slice(i, i+=1).readUInt8();
    const host= ATYP==1? msg.slice(i,i+=4).join('.')://IPV4
    (ATYP==2? new TextDecoder().decode(msg.slice(i+1, i+=1+msg.slice(i,i+1).readUInt8()))://domain
    (ATYP==3? msg.slice(i,i+=16).reduce((s,b,i,a)=>(i%2?s.concat(a.slice(i-1,i+1)):s), []).map(b=>b.readUInt16BE(0).toString(16)).join(':'):''));//ipv6

    logcb('conn:', host,port);
    ws.send(new Uint8Array([VERSION, 0]));
    const duplex=createWebSocketStream(ws);
     net.connect({host,port}, function(){
        this.write(msg.slice(i));
        duplex.on('error',errcb('E1:')).pipe(this).on('error',errcb('E2:')).pipe(duplex);
    }).on('error',errcb('Conn-Err:',{host,port}));
  }).on('error',errcb('EE:'));
});
