const SerialPort = require('serialport');
// Promise approach
SerialPort.list().then(ports => {
  ports.forEach(function(port) {
    //console.log(port.path);
    if(port.path.includes("LEGOHub")){
        console.log(port.path)
    }
  });
});