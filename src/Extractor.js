'use strict';

// \n和备注
var Reg_Lf_Rem = /\\\\?n|\n|\\\\?r|\/\*[\s\S]+?\*\//g;

var SpaceReg = /\s+/g;
var TrimReg = /(^|,)\s+|\s+($)/g; //前空格，逗号后的空格; 后空格

var isRgb = /rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*0?\.(\d+))?\)/;

module.exports = function Extractor(options) {
  var matchColorRegs = options.matchColors.map(c => {
    var rgbGroup = c.match(isRgb);
    if (rgbGroup) {
      if (rgbGroup[4]) {
        return new RegExp(
          'rgba\\(' +
            rgbGroup[1] +
            ',\\s*' +
            rgbGroup[2] +
            ',\\s*' +
            rgbGroup[3] +
            ',\\s*' +
            '0?\\.' +
            rgbGroup[4] +
            '\\)',
          'i'
        );
      }
      return new RegExp(
        'rgb\\(' +
          rgbGroup[1] +
          ',\\s*' +
          rgbGroup[2] +
          ',\\s*' +
          rgbGroup[3] +
          '\\)',
        'i'
      );
    }
    return new RegExp(c, 'i');
  });

  this.extractColors = function(src) {
    src = src.replace(Reg_Lf_Rem, '');
    var ret = [];
    var nameStart,
      nameEnd,
      cssEnd = -1;
    while (true) {
      nameStart = cssEnd + 1;
      nameEnd = src.indexOf('{', nameStart);
      cssEnd = findCssEnd(src, nameEnd);
      if (cssEnd > -1 && cssEnd > nameEnd && nameEnd > nameStart) {
        var cssCode = src.slice(nameEnd + 1, cssEnd);
        if (cssCode.indexOf('{') > -1) {
          // @keyframes
          var rules = this.extractColors(cssCode);
        } else {
          rules = this.getRules(cssCode);
        }
        if (rules.length) {
          var selector = src.slice(nameStart, nameEnd);
          selector = selector.replace(TrimReg, '$1');
          selector = selector.replace(SpaceReg, ' '); // lines
          var p = selector.indexOf(';'); //@charset utf-8;
          if (p > -1) {
            selector = selector.slice(p + 1);
          }
          // 改变选择器
          if (options.changeSelector) {
            selector =
              options.changeSelector(
                selector
                  .split(',')
                  .sort()
                  .join(','),
                rules
              ) || selector;
          }
          ret.push(selector + '{' + rules.join(';') + '}');
        }
      } else {
        break;
      }
    }
    return ret;

    // 查找css尾部，兼容 @keyframes {10%{...}}
    function findCssEnd(src, start) {
      var level = 1;
      var cssEnd = start;
      while (true) {
        cssEnd++;
        var char = src[cssEnd];
        if (!char) {
          return -1;
        } else if (char === '{') {
          level++;
        } else if (char === '}') {
          level--;
          if (level === 0) {
            break;
          }
        }
      }
      return cssEnd;
    }
  };
  this.getRules = function(cssCode) {
    var rules = cssCode.split(';');
    var ret = [];
    rules.forEach(rule => {
      if (this.testCssCode(rule)) {
        ret.push(rule.replace(SpaceReg, ' '));
      }
    });
    return ret;
  };

  this.testCssCode = function(cssCode) {
    for (var colorReg of matchColorRegs) {
      if (colorReg.test(cssCode)) return true;
    }
    return false;
  };
};
