'use strict';

var idMap = {};
var theme_COLOR_config;

var isRgb = /rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*0?\.(\d+))?\)/;

function generateColorRegex(color) {
  var rgbGroup = color.match(isRgb);
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
  return new RegExp(color, 'i');
}

module.exports = {
  changeColor: function(options, promiseForIE) {
    var win = window; // || global
    if (!theme_COLOR_config) {
      theme_COLOR_config = win.__theme_COLOR_cfg || {};
    }
    var oldColors = options.oldColors || theme_COLOR_config.colors || [];
    var newColors = options.newColors || [];

    var cssUrl = theme_COLOR_config.url || options.cssUrl;
    if (options.changeUrl) {
      cssUrl = options.changeUrl(cssUrl);
    }

    var _this = this;
    var Promise = promiseForIE || win.Promise;
    return new Promise(function(resolve, reject) {
      if (isSameArr(oldColors, newColors)) {
        resolve();
      } else {
        getCssText(cssUrl, setCssTo, resolve, reject);
      }
    });

    function getCssText(url, setCssTo, resolve, reject) {
      var elStyle = idMap[url] && document.getElementById(idMap[url]);
      if (elStyle) {
        oldColors = elStyle.color.split('|');
        setCssTo(elStyle, elStyle.innerText);
        resolve();
      } else {
        elStyle = document.head.appendChild(document.createElement('style'));
        idMap[url] = 'css_' + +new Date();
        elStyle.setAttribute('id', idMap[url]);
        _this.getCSSString(
          url,
          function(cssText) {
            setCssTo(elStyle, cssText);
            resolve();
          },
          reject
        );
      }
    }

    function setCssTo(elStyle, cssText) {
      cssText = _this.replaceCssText(cssText, oldColors, newColors);
      elStyle.color = newColors.join('|');
      elStyle.innerText = cssText;
      theme_COLOR_config.colors = newColors;
    }
  },
  replaceCssText: function(cssText, oldColors, newColors) {
    oldColors.forEach(function(color, t) {
      cssText = cssText.replace(generateColorRegex(color), newColors[t]);
    });
    return cssText;
  },
  getCSSString: function(url, resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(xhr.status);
        }
      }
    };
    xhr.onerror = function(e) {
      reject(e);
    };
    xhr.ontimeout = function(e) {
      reject(e);
    };
    xhr.open('GET', url);
    xhr.send();
  },
};

function isSameArr(oldColors, newColors) {
  if (oldColors.length !== newColors.length) {
    return false;
  }
  for (var i = 0, j = oldColors.length; i < j; i++) {
    if (oldColors[i] !== newColors[i]) {
      return false;
    }
  }
  return true;
}
