/*eslint-disable */
define(["jquery", "knockout", "Magento_Ui/js/lib/key-codes", "underscore"], function (_jquery, _knockout, _keyCodes, _underscore) {
  "use strict";

  _jquery = _interopRequireDefault(_jquery);
  _knockout = _interopRequireDefault(_knockout);
  _keyCodes = _interopRequireDefault(_keyCodes);
  _underscore = _interopRequireDefault(_underscore);

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

  /**
   * Copyright © Magento, Inc. All rights reserved.
   * See COPYING.txt for license details.
   */

  /**
   * @api
   */

  /**
   * Add or remove the placeholder-text class from the element based on its content
   *
   * @param {Element} element
   */
  function handlePlaceholderClass(element) {
    if (element.innerHTML.length === 0) {
      (0, _jquery.default)(element).addClass("placeholder-text");
    } else {
      (0, _jquery.default)(element).removeClass("placeholder-text");
    }
  } // Custom Knockout binding for live editing text inputs


  _knockout.default.bindingHandlers.liveEdit = {
    /**
     * Init the live edit binding on an element
     *
     * @param {any} element
     * @param {() => any} valueAccessor
     * @param {KnockoutAllBindingsAccessor} allBindings
     * @param {any} viewModel
     * @param {KnockoutBindingContext} bindingContext
     */
    init: function init(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var _valueAccessor = valueAccessor(),
          field = _valueAccessor.field,
          placeholder = _valueAccessor.placeholder,
          _valueAccessor$select = _valueAccessor.selectAll,
          selectAll = _valueAccessor$select === void 0 ? false : _valueAccessor$select;

      var focusedValue = element.innerHTML;
      /**
       * Strip HTML and return text
       *
       * @param {string} html
       * @returns {string}
       */

      var stripHtml = function stripHtml(html) {
        var tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        return tempDiv.textContent;
      };
      /**
       * Record the value on focus, only conduct an update when data changes
       */


      var onFocus = function onFocus() {
        focusedValue = stripHtml(element.innerHTML);

        if (selectAll && element.innerHTML !== "") {
          _underscore.default.defer(function () {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
          });
        }
      };
      /**
       * Mousedown event on element
       *
       * @param {Event} event
       */


      var onMouseDown = function onMouseDown(event) {
        event.stopPropagation();
      };
      /**
       * Key down event on element
       *
       * Prevent styling such as bold, italic, and underline using keyboard commands, and prevent multi-line entries
       *
       * @param {JQueryEventObject} event
       */


      var onKeyDown = function onKeyDown(event) {
        var key = _keyCodes.default[event.keyCode]; // command or control

        if (event.metaKey || event.ctrlKey) {
          if (key === "bKey" || key === "iKey" || key === "uKey") {
            event.preventDefault();
          }
        }

        if (key === "enterKey") {
          event.preventDefault();
        } // prevent slides from sliding


        if (key === "pageLeftKey" || key === "pageRightKey") {
          event.stopPropagation();
        }
      };
      /**
       * On key up update the view model to ensure all changes are saved
       */


      var onKeyUp = function onKeyUp() {
        if (focusedValue !== stripHtml(element.innerHTML)) {
          viewModel.updateData(field, stripHtml(element.innerHTML));
        }
      };
      /**
       * Prevent content from being dropped inside of inline edit area
       *
       * @param {DragEvent} event
       */


      var onDrop = function onDrop(event) {
        event.preventDefault();
      };
      /**
       * Input event on element
       */


      var onInput = function onInput() {
        handlePlaceholderClass(element);
      };

      element.setAttribute("data-placeholder", placeholder);
      element.textContent = viewModel.parent.dataStore.get(field);
      element.contentEditable = true;
      element.addEventListener("focus", onFocus);
      element.addEventListener("mousedown", onMouseDown);
      element.addEventListener("keydown", onKeyDown);
      element.addEventListener("keyup", onKeyUp);
      element.addEventListener("input", onInput);
      element.addEventListener("drop", onDrop);
      (0, _jquery.default)(element).parent().css("cursor", "text");
      handlePlaceholderClass(element); // Create a subscription onto the original data to update the internal value

      viewModel.parent.dataStore.subscribe(function () {
        element.textContent = viewModel.parent.dataStore.get(field);
        handlePlaceholderClass(element);
      }, field);
    },

    /**
     * Update live edit binding on an element
     *
     * @param {any} element
     * @param {() => any} valueAccessor
     * @param {KnockoutAllBindingsAccessor} allBindings
     * @param {any} viewModel
     * @param {KnockoutBindingContext} bindingContext
     */
    update: function update(element, valueAccessor, allBindings, viewModel, bindingContext) {
      var _valueAccessor2 = valueAccessor(),
          field = _valueAccessor2.field;

      element.textContent = viewModel.parent.dataStore.get(field);
      handlePlaceholderClass(element);
    }
  };
});
//# sourceMappingURL=live-edit.js.map
