const Cul = require('cul');
const mqtt = require('mqtt')


// FS20 Wandschalter:
// 1112 | 1114
//   01 |   03
// -----------
// 1111 | 1113
//   00 |   02

const debug = process.env.DEBUG || false;
const houseCode = 'D8B6'; //'4231 3423'
const mqttBroker = '192.168.64.216';
const fs20 = new Cul({
  serialport: '/dev/ttyACM0',
  mode: 'SlowRF'
});

const CMD_ON='11';
const CMD_OFF='00';
const CMD_TOGGLE='12';

const map = {
  '01': {
    'state': false,
    'target': '04'
  },
  '03': {
    'state': false,
    'target': '05'
  },
  '00': {
    'state': false,
    'target': '06'
  },
  '02': {
    'state': false,
    'target': '07'
  },
}


const send = (device, cmd, repeats = 3) => {
  console.log(`Sending command '${cmd}' to device '${device}'...`);
  fs20.cmd('FS20', houseCode, device, cmd);
  if (repeats > 0) {
    setTimeout(() => send(device, cmd, --repeats), 500);
  }
}

const command = (addressDevice, cmd) => {
  if (!map[addressDevice])
    return; 

  const mapping = map[addressDevice];

  console.log(`Incoming command '${cmd}' from device '${addressDevice}'...`);

  switch (cmd) {
    case 'toggle': send(mapping.target, mapping.state ? CMD_OFF : CMD_ON);
                   mapping.state = !mapping.state;
                   break;
    case 'off':    send(mapping.target, CMD_OFF);
                   mapping.state = false;
                   break;
    case 'on':     send(mapping.target, CMD_ON);
                   mapping.state = true;
                   break;
  }
}

fs20.on('data', (raw, obj) => {
  if (debug)
    console.log(obj);

  if (!obj)
    return;

  const { data } = obj;
  if (!data)
    return;

  // addressCodeElv: '4231 3423'
  // addressDeviceElv: '1112',  
  const { addressCode, addressDevice, cmd } = data;

  if (addressCode !== houseCode)
    return;

  command(addressDevice, cmd); 
});

const mqttClient  = mqtt.connect('mqtt://' + mqttBroker)
 
mqttClient.on('connect', function () {
  mqttClient.subscribe('home/fs20/cmd/+');
})
 
mqttClient.on('message', function (topic, message) {
  if (matches = topic.match(/^home\/fs20\/cmd\/([0-9]+)$/)) {
    const addressDevice = matches[1];
    command(addressDevice, message.toString());
  }
})
