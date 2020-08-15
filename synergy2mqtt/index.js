const serverAddress = '44.128.4.3';
const switchMatcher=new RegExp(/INFO: switch from "(\S+)" to "(\S+)"/);

const child = require('child_process').execFile('/usr/bin/synergys', ('-f -c /home/e/.synergys.conf -a '+serverAddress).split(' ')); 

child.stdout.on('data', function(data) {
    const match = data.toString().match(switchMatcher);
    if (match) {
        console.log('switched from', match[1], 'to', match[2]); 
    }
});
