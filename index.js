var parse = require('xml-parser');
var render = require('xml-render');
var fmt = require('util').format;
var h = require('hyperscript');
var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var $ = require('jquery');
var isColumnMode = true;

module.exports = Viewer;
inherits(Viewer, EventEmitter);
var pathsToBeSelected = [];
var uniqueColumnsPathSelected = [];
function Viewer(xml, pathsToBeSelected, uniqueColumnsPathSelected){
  EventEmitter.call(this);
  this.pathsToBeSelected = pathsToBeSelected;
  this.uniqueColumnsPathSelected = uniqueColumnsPathSelected;
  if (typeof xml != 'string') xml = xml.toString();
  var obj = parse(xml);
  this._el = this._renderRoot(obj);
  this._selection = null;
}
Viewer.prototype.removeSelection = function(path){
  $(this._el).find('a.nodeLabel.selected').each(function(){
	if($(this).attr('href') === path) {
	  $(this).removeClass('selected');
	}
  })
  $(this._el).find('a.attributeLabel.selected').each(function(){
	if($(this).attr('href') === path) {
	  $(this).removeClass('selected');
	}
  })
  $(this._el).find('a.attributeVal.selected').each(function(){
	if($(this).attr('href') === path) {
	  $(this).removeClass('selected');
	}
  })
};
Viewer.prototype.removeSelectionForUniqueColumn = function(path){
  $(this._el).find('a.nodeLabel.uniqueColumnClass').each(function(){
	if($(this).attr('href') === path) {
	  $(this).removeClass('uniqueColumnClass');
	}
  })
};


Viewer.prototype.currentMode = function(currentMode){
  if(currentMode == 'UNIQUE_COLUMN'){
	this.isColumnMode = false;
  }else {
	this.isColumnMode = true;
  }
};

Viewer.prototype.appendTo = function(el){
  var self = this;
  el.appendChild(this._el);
  el.addEventListener('click', function(ev){
	if (ev.target == el) self._setSelection(null);
  });
};

Viewer.prototype._setSelection = function(node){
  if (this._selection === node) return;

  if (this._selection) this._selection.el.classList.remove('selected');
  if (node) node.el.classList.add('selected');
  this._selection = node;
  this.emit('select', this._selection);
};

Viewer.prototype.getSelection = function(){
  return this._selection;
};

Viewer.prototype._renderRoot = function(node){
  var self = this;
  node.text = function(){
	return render.node(node);
  };
  var el = h('span',
	  spaces(2),
	  render.declaration(node.declaration),
	  this._renderNode(node.root)
  );
  node.el = el;
  return el;
};

Viewer.prototype._renderNode = function(node, indent){
  var self = this;
  var folded = false;
  indent = indent || 0;

  if (!node.children || !node.children.length) return this._renderLeaf(node, indent);

  function ontoggle(ev){
	ev.stopPropagation();
	if (folded) {
	  ev.target.innerHTML = '';
	  ev.target.classList.remove('closeTag');
	  ev.target.classList.add('openTag');
	  node.children.forEach(function(child){
		child.el.style.display = 'inline';
	  });
	} else {
	  ev.target.innerHTML = '';
	  ev.target.classList.remove('openTag');
	  ev.target.classList.add('closeTag');
	  node.children.forEach(function(child){
		child.el.style.display = 'none';
	  });
	}
	folded = !folded;
  }

  node.text = function(){
	return render.node(node);
  };
  node.path = node.path || node.name;

  var el = h('span',
	  h('br'),
	  tabs(indent),
	  h('span.openTag', { onclick: ontoggle }, ''),
	  spaces(1, true),
	  h('span.nodeLabel',' ', '<'),
	  h('span',' ', this._tagOpen(node)),
	  h('span',' ', this._renderAttribute(node)),
	  h('span.nodeLabel',' ', '>'),
	  node.content,
	  node.children.map(function(child){
		child.path  = (node.path ? (node.path + "/" ) : "") + child.name;
		return self._renderNode(child, indent + 1);
	  }),
	  h('br'),
	  tabs(indent),
	  spaces(2),
	  this._tagClose(node)
  );

  node.el = el;
  return el;
}

Viewer.prototype._tagClose = function(node){
  return h('a.nodeLabel', { }, fmt('</%s>', node.name));
}

Viewer.prototype._tagOpen = function(node){
  var el;
  var me = this;
  el = h('a.nodeLabel', { href: '/'+node.path }, fmt('%s', node.name));
  if(_.includes(this.pathsToBeSelected, '/'+node.path)) {
	el.classList.add('selected');
  }
  if(_.includes(this.uniqueColumnsPathSelected, '/'+node.path)) {
	el.classList.add('uniqueColumnClass');
  }

  el.addEventListener('click', function(event){
	event.preventDefault();
	var isSelected = false;
	if(me.isColumnMode) {
	  if(_.includes(el.classList, 'selected')) {
		el.classList.remove('selected');
		isSelected = false;
	  }else {
		el.classList.add('selected');
		isSelected = true;
	  }
	}else {
	  if(_.includes(el.classList, 'uniqueColumnClass')) {
		el.classList.remove('uniqueColumnClass');
		isSelected = false;
	  }else {
		el.classList.add('uniqueColumnClass');
		isSelected = true;
	  }
	}
	var obj =  {
	  el: el,
	  node: node,
	  isSelected: isSelected
	}
	me.emit('nodeLableClicked', obj);
  });
  return el;
}
Viewer.prototype._renderAttribute = function (node){
  var mainEl = h('span');
  var el, attrValLable, valEl;
  var me = this;

  _.forEach(node.attributes, function(val , key){
	var attribute ='a.attributeLabel';
	attrValLable = 'a.attributeVal';
	if(_.includes(me.pathsToBeSelected, '/' + node.path + '/@'+key+'="'+val+'"')) {
	  attrValLable = 'a.attributeVal.selected';
	}
    if(_.includes(me.pathsToBeSelected, '/' + node.path + '/@'+key)) {
      attribute = 'a.attributeLabel.selected';
    }
	valEl = h(attrValLable, { href: '/' + node.path + '/@'+key+'="'+val+'"' }, fmt('%s', val));
	valEl.addEventListener('click', function(event){
	  event.preventDefault();
	  event.stopPropagation();
	  if(!me.isColumnMode) {
		return;
	  }
	  var isSelected = false;
	  if(_.includes(event.currentTarget.classList, 'selected')) {
		$(event.currentTarget).removeClass('selected');
		isSelected = false;
	  }else {
		$(event.currentTarget).addClass('selected');
		isSelected = true;
	  }
	  var obj =  {
		el: $(event.currentTarget),
		node: node,
		path: node.path + '@'+key+'='+val,
		isSelected: isSelected
	  }
	  me.emit('attributeLableClicked', obj);
	});
	el = h(attribute, { href: '/' + node.path + '/@'+key}, fmt('%s', key));
	el.addEventListener('click', function(event){
	  event.preventDefault();
	  event.stopPropagation();
	  if(!me.isColumnMode) {
		return;
	  }
	  var isSelected = false;
	  if(_.includes(event.currentTarget.classList, 'selected')) {
		$(event.currentTarget).removeClass('selected');
		isSelected = false;
	  }else {
		$(event.currentTarget).addClass('selected');
		isSelected = true;
	  }
	  var obj =  {
		el: $(event.currentTarget),
		node: node,
		path: node.path + '@'+key,
		isSelected: isSelected
	  }
	  me.emit('attributeLableClicked', obj);
	});
	var space = h('span'), equalToSpan = h('span'), endValEl = h('span');
	space.innerHTML = '&nbsp';
	equalToSpan.innerHTML = '="';
	endValEl.innerHTML = '"';
	$(mainEl).append(space);
	$(mainEl).append(el);
	$(mainEl).append(equalToSpan);
	$(mainEl).append(valEl);
	$(mainEl).append(endValEl);
  });
  return mainEl;
}

Viewer.prototype._onAttributeClick = function (event, key){
  event.preventDefault();
}
Viewer.prototype._renderLeaf = function(node, indent){
  var self = this;

  node.text = function(){
	return render.node(node);
  };
  var el = h('span',
	  h('br'),
	  tabs(indent, true),
	  spaces(2, true),
	  h('span.nodeLabel',' ', '<'),
	  h('span',' ', this._tagOpen(node)),
	  h('span',' ', this._renderAttribute(node)),
	  h('span.nodeLabel',' ', '>'),
	  node.content,
	  this._tagClose(node)
  );
  if(_.includes(this.pathsToBeSelected, node.path)) {
	el.classList.add('selected');
  }
  node.el = el;
  return el;
}

Viewer.prototype._handleClick = function(node){
  var self = this;
  return function(ev){
	ev.stopPropagation();
	self._setSelection(node);
  };
};

function tabs(n){
  var out = [];
  for (var i = 0; i < n; i++) out.push(spaces(4));
  return out;
}

function spaces(n, isLineNeeded){
  var el = document.createElement('span');
  for (var i = 0; i < n+1; i++) {
	if(i === 0 && !isLineNeeded) {
	  el.innerHTML += '<span class="xml-line">&#xff5c</span>';
	}else {
	  el.innerHTML += '&nbsp';
	}
  }
  return el;
}

function renderName(node) {
  var el = document.createElement('span');
  el.classList.add('xml-node-name');
  el.innerHTML = '<'+node.name +'>';
  return el;
}
