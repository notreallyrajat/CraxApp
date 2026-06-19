const fs = require('fs');
const potrace = require('potrace');

potrace.trace('CraxLogo.png', function(err, svg) {
  if (err) throw err;
  fs.writeFileSync('assets/images/CraxLogo.svg', svg);
  console.log('SVG created!');
});
