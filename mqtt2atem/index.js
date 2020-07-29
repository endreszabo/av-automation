const { Atem } = require('atem-connection')
const myAtem = new Atem({ externalLog: console.log })

myAtem.connect('44.128.4.69')

myAtem.on('connected', () => {
        myAtem.changeProgramInput(3).then((res) => {
                console.log(res)
                // ProgramInputCommand {
                //      flag: 0,
                //      rawName: 'PrgI',
                //      mixEffect: 0,
                //      properties: { source: 3 },
                //      resolve: [Function],
                //      reject: [Function] }
        })
        console.log(myAtem.state)
})

myAtem.on('stateChanged', function(err, state) {
  console.log(state);
//  console.log(myAtem.state);
  console.log(JSON.stringify(myAtem.state.video.ME[0], null, 2));
});


