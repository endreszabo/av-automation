const serverAddress = '44.128.4.3';
const baseAddr = '/synergy2mqtt/'+serverAddress+'/';

// Set up MQTT
const MqttTopic = require('mqtt-wildcard-emitter');
MqttTopic.connect('mqtt://44.128.7.255');

// Set up Synergy
const switchMatcher=new RegExp(/INFO: switch from "(\S+)" to "(\S+)"/);
const child = require('child_process').execFile('/usr/bin/synergys', ('-f -c /home/e/.synergys.conf -a '+serverAddress).split(' ')); 

child.stdout.on('data', function(data) {
    const match = data.toString().match(switchMatcher);
    if (match) {
        console.log('switched from', match[1], 'to', match[2]); 
        MqttTopic.mqttclient.publish(baseAddr+'switch/from_to', match[1]+"\t"+match[2]);
        MqttTopic.mqttclient.publish(baseAddr+'switched_from', match[1]);
        MqttTopic.mqttclient.publish(baseAddr+'switched_to', match[2]);
        MqttTopic.mqttclient.publish(baseAddr+'screen/'+match[1]+'/active', "0");
        MqttTopic.mqttclient.publish(baseAddr+'screen/'+match[2]+'/active', "1");
    } else {
        console.log(data)
    }
});
