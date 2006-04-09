var pos = [
  "height", "width", "top", "left", "bottom", "right",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "lineHeight", "maxWidth", "maxHeight", "minWidth", "minHeight",
  "textIndent", "fontSize"
];

for ( var i = 0; i < pos.length; i++ ) {
	(function(){
		var o = pos[i];
		$.fn[o] = function(a){
			return a ?
				this.css(o,a) :
				parseInt( this.css(o) );
		};
	})();
}

var posArg = [
	"clientLeft", "clientTop", "clientWidth", "clientHeight",
	"offsetLeft", "offsetTop", "offsetWidth", "offsetHeight",
	"scrollLeft", "scrollTop", "scrollWidth", "scrollHeight"
];

for ( var i = 0; i < posArg.length; i++ ) {
	(function(){
		var o = posArg[i];
		$.fn[o] = function(a){
			return a ? this.each(function(){
				this[o] = parseInt( a );
			}) : this.size() > 0 ?
				this.get(0)[o] :
				null;
		};
	})();
}