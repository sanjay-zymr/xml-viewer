var Viewer = require('..');
var fs = require('fs');
var xml = fs.readFileSync(__dirname + '/data.xml');

var view = new Viewer(xml);
view.appendTo(document.body);

view.on('select', function(node){
  if (!node) return console.log('nothing selected');
  console.log('selected:');
  console.log(node);
  console.log(node.text());
});

