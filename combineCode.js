const renderFile = file => `[function(require,module,exports,_createElement,_renderElement){${file.code}},${JSON.stringify(file.requires)}]`;

const combineCode = files => {
    const startCode = `(function(a){function _ce(n,p,c){var e=document.createElement(n);var ks=Object.keys(p);for(var i=0;i<ks.length;i++){var k=ks[i];var v=p[k];if(k=="style"){if(typeof v=="object")Object.assign(e.style,v);else e.style.cssText=v}else if(k.match(/^data-?/i))e.dataset[k.replace(/^data\-?/i,"")]=v;else if(k.match(/^on/i))e.addEventListener(k.replace(/^on/i,"").toLowerCase(),v);else if(e.hasOwnProperty(k))e[k]=v;else e.setAttribute(k,v);}for(var i=0;i<c.length;i++)ae(c[i],e);return e;function ae(e,w){if(e instanceof Node)w.appendChild(e);else if(e instanceof Array)for(var i=0;i<e.length;i++)ae(e[i],w);else w.appendChild(document.createTextNode(e))}}function _re(e,s){if(!(e instanceof Node)||typeof s!="string")throw new Error("Wrong arguments: expected _renderElement(Node, string)");var w=document.querySelector(s);if(w!=null)w.appendChild(e);return e}var c={};r(0);function r(name){var n=name;if(!c[n]){if(!a[n]){var e=new Error("Cannot find module '"+n+"'");throw e.code="MODULE_NOT_FOUND",e}var m={exports:{}};c[n]=m.exports;a[n][0].call(window,function(name){return r(a[n][1][name]||name)},m,m.exports,_ce,_re,c)}return c[n]}})([`;

    const fileCode = [];
    for (const file of files)
        fileCode.push(renderFile(file));

    const endCode = `])`;

    return startCode + fileCode.join(",") + endCode;
};

module.exports = combineCode;
