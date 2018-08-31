/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

import $ from "jquery";
import ko from "knockout";
import $t from "mage/translate";
import events from "Magento_PageBuilder/js/events";
import confirmationDialog from "Magento_PageBuilder/js/modal/dismissible-confirm";
import _ from "underscore";
import "../binding/live-edit";
import "../binding/sortable";
import "../binding/sortable-children";
import ContentTypeCollectionInterface from "../content-type-collection.d";
import ContentTypeConfigInterface from "../content-type-config.d";
import createContentType from "../content-type-factory";
import ContentTypeMenu from "../content-type-menu";
import Edit from "../content-type-menu/edit";
import HideShowOption from "../content-type-menu/hide-show-option";
import Option from "../content-type-menu/option";
import {OptionsInterface} from "../content-type-menu/option.d";
import TitleOption from "../content-type-menu/title-option";
import ContentTypeInterface from "../content-type.d";
import {DataObject} from "../data-store";
import {animateContainerHeight, animationTime, lockContainerHeight} from "../drag-drop/container-animation";
import {getSortableOptions} from "../drag-drop/sortable";
import appearanceConfig from "./appearance-config";
import ObservableObject from "./observable-object.d";
import ObservableUpdater from "./observable-updater";

/**
 * @api
 */
export default class Preview {
    public parent: ContentTypeCollectionInterface;
    public config: ContentTypeConfigInterface;
    public data: ObservableObject = {};
    public displayLabel: KnockoutObservable<string> = ko.observable();
    public display: KnockoutObservable<boolean> = ko.observable(true);
    public wrapperElement: Element;
    public placeholderCss: KnockoutObservable<object>;
    public isPlaceholderVisible: KnockoutObservable<boolean> = ko.observable(true);
    public isEmpty: KnockoutObservable<boolean> = ko.observable(true);

    /**
     * @deprecated
     */
    public previewData: ObservableObject = {};

    /**
     * Fields that should not be considered when evaluating whether an object has been configured.
     *
     * @see {Preview.isConfigured}
     * @type {[string]}
     */
    protected fieldsToIgnoreOnRemove: string[] = [];
    protected events: DataObject = {};

    private edit: Edit;
    private optionsMenu: ContentTypeMenu;
    private observableUpdater: ObservableUpdater;
    private mouseover: boolean = false;
    private mouseoverContext: Preview;

    /**
     * @param {ContentTypeInterface} parent
     * @param {ContentTypeConfigInterface} config
     * @param {ObservableUpdater} observableUpdater
     */
    constructor(
        parent: ContentTypeInterface,
        config: ContentTypeConfigInterface,
        observableUpdater: ObservableUpdater,
    ) {
        this.parent = parent;
        this.config = config;
        this.edit = new Edit(this.parent, this.parent.dataStore);
        this.optionsMenu = new ContentTypeMenu(this, this.retrieveOptions());
        this.observableUpdater = observableUpdater;
        this.displayLabel(this.config.label);
        this.placeholderCss = ko.observable({
            "visible": this.isEmpty,
            "empty-placeholder-background": this.isPlaceholderVisible,
        });
        this.setupDataFields();
        this.bindEvents();
    }

    /**
     * Retrieve the preview template
     *
     * @returns {string}
     */
    get previewTemplate(): string {
        const appearance = this.previewData.appearance ? this.previewData.appearance() : undefined;
        return appearanceConfig(this.config.name, appearance).preview_template;
    }

    /**
     * Calls methods by event name.
     *
     * @param {string}  eventName
     * @param {any} params
     */
    public trigger(eventName: string, params: any): void {
        if (this.events[eventName]) {
            const methods = this.events[eventName] as string;

            _.each(methods.split(" "), (methodName) => {
                const method = (this as any)[methodName];

                if (method) {
                    method.call(this, params);
                }
            }, this);
        }
    }

    /**
     * Tries to call specified method of a current content type.
     *
     * @param args
     */
    public delegate(...args: any[]) {
        const methodName = args.slice(0, 1)[0];
        const method = (this as any)[methodName];

        if (method) {
            method.apply(this, args.slice(1, args.length));
        }
    }

    /**
     * Open the edit form for this content type
     */
    public openEdit(): void {
        return this.edit.open();
    }

    /**
     * Update data store
     *
     * @param {string} key
     * @param {string} value
     */
    public updateData(key: string, value: string) {
        const data = this.parent.dataStore.get() as DataObject;

        data[key] = value;
        this.parent.dataStore.update(data);
    }

    /**
     * Update the data value of a part of our internal Knockout data store
     *
     * @param {string} key
     * @param value
     * @deprecated
     */
    public updateDataValue(key: string, value: any) {
        if (typeof this.previewData[key] !== "undefined" && ko.isObservable(this.previewData[key])) {
            this.previewData[key](value);
        } else {
            if (_.isArray(value)) {
                this.previewData[key] = ko.observableArray(value);
            } else {
                this.previewData[key] = ko.observable(value);
            }
        }
    }

    /**
     * Set state based on mouseover event for the preview
     *
     * @param {Preview} context
     * @param {Event} event
     */
    public onMouseOver(context: Preview, event: Event): void {
        if (this.mouseover) {
            return;
        }

        // Ensure no other options panel is displayed
        $(".pagebuilder-options-visible").removeClass("pagebuilder-options-visible");

        this.mouseover = true;
        this.mouseoverContext = context;
        const currentTarget = event.currentTarget;
        let optionsMenu = $(currentTarget).find(".pagebuilder-options-wrapper");

        if (!$(currentTarget).hasClass("type-nested")) {
            optionsMenu = optionsMenu.first();
        }

        optionsMenu.parent().addClass("pagebuilder-options-visible");

        $(currentTarget).addClass("pagebuilder-content-type-active");
    }

    /**
     * Set state based on mouseout event for the preview
     *
     * @param {Preview} context
     * @param {Event} event
     */
    public onMouseOut(context: Preview, event: Event) {
        this.mouseover = false;
        _.delay(() => {
            if (!this.mouseover && this.mouseoverContext === context) {
                const currentTarget = event.currentTarget;
                let optionsMenu = $(currentTarget).find(".pagebuilder-options-wrapper");

                if (!$(currentTarget).hasClass("type-nested")) {
                    optionsMenu = optionsMenu.first();
                }

                optionsMenu.parent().removeClass("pagebuilder-options-visible");
                $(currentTarget).removeClass("pagebuilder-content-type-active");
            }
        }, 100); // 100 ms delay to allow for users hovering over other elements
    }

    /**
     * After children render fire an event
     *
     * @param {Element} element
     * @deprecated
     */
    public afterChildrenRender(element: Element): void {
        events.trigger("contentType:childrenRenderAfter", {id: this.parent.id, contentType: this.parent, element});
        events.trigger(
            this.parent.config.name + ":childrenRenderAfter",
            {
                contentType: this.parent,
                element,
                id: this.parent.id,
            },
        );
    }

    /**
     * Dispatch an after render event for individual content types
     *
     * @param {Element[]} elements
     */
    public dispatchAfterRenderEvent(elements: Element[]): void {
        const elementNodes = elements.filter((renderedElement: Element) => {
            return renderedElement.nodeType === Node.ELEMENT_NODE;
        });
        if (elementNodes.length > 0) {
            const element = elementNodes[0];
            this.wrapperElement = element;
            events.trigger("contentType:renderAfter", {id: this.parent.id, contentType: this.parent, element});
            events.trigger(
                this.parent.config.name + ":renderAfter",
                {
                    contentType: this.parent,
                    element,
                    id: this.parent.id,
                },
            );
            this.disableImageUploadOnHide(element);
        }
    }

    /**
     * Get the options instance
     *
     * @returns {ContentTypeMenu}
     */
    public getOptions(): ContentTypeMenu {
        return this.optionsMenu;
    }

    /**
     * Handle user editing an instance
     */
    public onOptionEdit(): void {
        this.openEdit();
    }

    /**
     * Reverse the display data currently in the data store
     */
    public onOptionVisibilityToggle(): void {
        const display = this.parent.dataStore.get("display");
        this.parent.dataStore.update(!display, "display");
    }

    /**
     * Handle duplicate of items
     */
    public onOptionDuplicate(): void {
        this.clone(this.parent);
    }

    /**
     * Duplicate content type
     *
     * @param {ContentTypeInterface & ContentTypeCollectionInterface} contentType
     * @param {boolean} autoAppend
     * @returns {Promise<ContentTypeInterface> | void}
     */
    public clone(
        contentType: ContentTypeInterface | ContentTypeCollectionInterface,
        autoAppend: boolean = true,
    ): Promise<ContentTypeInterface> | void {
        const contentTypeData = contentType.dataStore.get() as DataObject;
        const index = contentType.parent.getChildren()().indexOf(contentType) + 1 || null;

        return new Promise((resolve) => {
            createContentType(
                contentType.config,
                contentType.parent,
                contentType.stageId,
                contentTypeData,
            ).then((duplicateContentType: ContentTypeInterface) => {
                if (autoAppend) {
                    contentType.parent.addChild(duplicateContentType, index);
                }

                this.dispatchContentTypeCloneEvents(contentType, duplicateContentType, index);

                resolve(duplicateContentType);
            });
        });
    }

    /**
     * Handle content type removal
     */
    public onOptionRemove(): void {
        const removeContentType = () => {
            const dispatchRemoveEvent = () => {
                const params = {
                    contentType: this.parent,
                    index: (this.parent.parent as ContentTypeCollectionInterface).getChildren().indexOf(this.parent),
                    parent: this.parent.parent,
                    stageId: this.parent.stageId,
                };
                events.trigger("contentType:removeAfter", params);
                events.trigger(this.parent.config.name + ":removeAfter", params);
            };

            if (this.wrapperElement) {
                const parentContainerElement = $(this.wrapperElement).parents(".type-container");
                const containerLocked =
                    (this.parent.parent as ContentTypeCollectionInterface).getChildren()().length === 1 &&
                    lockContainerHeight(parentContainerElement);

                // Fade out the content type
                $(this.wrapperElement).fadeOut(animationTime / 2, () => {
                    dispatchRemoveEvent();
                    // Prepare the event handler to animate the container height on render
                    animateContainerHeight(containerLocked, parentContainerElement);
                });
            } else {
                dispatchRemoveEvent();
            }
        };

        if (this.isConfigured()) {
            confirmationDialog({
                actions: {
                    confirm: () => {
                        // Call the parent to remove the child element
                        removeContentType();
                    },
                },
                content: $t("Are you sure you want to remove this item? The data within this item is not recoverable once removed."), // tslint:disable-line:max-line-length
                dismissKey: "pagebuilder_modal_dismissed",
                dismissible: true,
                title: $t("Confirm Item Removal"),
            });
        } else {
            removeContentType();
        }
    }

    /**
     * Determine if the container can receive drop events? With the current matrix system everything can unless
     * specified in an inherited preview instance.
     *
     * @returns {boolean}
     */
    public isContainer() {
        return true;
    }

    /**
     * Return the sortable options
     *
     * @returns {JQueryUI.SortableOptions}
     */
    public getSortableOptions(): JQueryUI.SortableOptions | any {
        return getSortableOptions(this);
    }

    /**
     * Get the CSS classes for the children element, as we dynamically create this class name it can't sit in the DOM
     * without causing browser issues
     *
     * @returns {{[p: string]: boolean}}
     */
    public getChildrenCss() {
        return {
            [this.config.name + "-container"]: true,
        };
    }

    /**
     * Return an array of options
     *
     * @returns {OptionsInterface}
     */
    protected retrieveOptions(): OptionsInterface {
        const options: OptionsInterface = {
            move: new Option({
                preview: this,
                icon: "<i class='icon-admin-pagebuilder-handle'></i>",
                title: $t("Move"),
                classes: ["move-structural"],
                sort: 10,
            }),
            title: new TitleOption({
                preview: this,
                title: this.config.label,
                template: "Magento_PageBuilder/content-type/title",
                sort: 20,
            }),
            edit: new Option({
                preview: this,
                icon: "<i class='icon-admin-pagebuilder-systems'></i>",
                title: $t("Edit"),
                action: this.onOptionEdit,
                classes: ["edit-content-type"],
                sort: 30,
            }),
            duplicate: new Option({
                preview: this,
                icon: "<i class='icon-pagebuilder-copy'></i>",
                title: $t("Duplicate"),
                action: this.onOptionDuplicate,
                classes: ["duplicate-structural"],
                sort: 50,
            }),
            remove: new Option({
                preview: this,
                icon: "<i class='icon-admin-pagebuilder-remove'></i>",
                title: $t("Remove"),
                action: this.onOptionRemove,
                classes: ["remove-structural"],
                sort: 60,
            }),
        };

        // If the content type is is_hideable show the hide / show option
        if (this.parent.config.is_hideable) {
            options.hideShow = new HideShowOption({
                preview: this,
                icon: HideShowOption.showIcon,
                title: HideShowOption.showText,
                action: this.onOptionVisibilityToggle,
                classes: ["hide-show-content-type"],
                sort: 40,
            });
        }

        return options;
    }

    /**
     * Dispatch content type clone events
     *
     * @param {ContentTypeInterface} originalContentType
     * @param {ContentTypeInterface} duplicateContentType
     * @param {number} index
     */
    protected dispatchContentTypeCloneEvents(
        originalContentType: ContentTypeInterface,
        duplicateContentType: ContentTypeInterface,
        index: number,
    ) {
        const duplicateEventParams = {
            original: originalContentType,
            duplicateContentType,
            index,
        };

        events.trigger("contentType:duplicateAfter", duplicateEventParams);
        events.trigger(originalContentType.config.name + ":duplicateAfter", duplicateEventParams);
    }

    /**
     * Bind events
     */
    protected bindEvents() {
        this.parent.dataStore.subscribe(
            (data: DataObject) => {
                this.updateObservables();
                this.updatePlaceholderVisibility(data);
                // Keep a reference to the display state in an observable for adding classes to the wrapper
                this.display(!!data.display);
            },
        );
        if (this.parent.children) {
            this.parent.children.subscribe(
                (children: any[]) => {
                    this.isEmpty(!children.length);
                },
            );
        }
    }

    /**
     * After observables updated, allows to modify observables
     */
    protected afterObservablesUpdated(): void {
        return;
    }

    /**
     * Setup fields observables within the data class property
     *
     * @deprecated
     */
    protected setupDataFields() {
        // Create an empty observable for all fields
        if (this.config.fields) {
            _.keys(this.config.fields).forEach((key: string) => {
                this.updateDataValue(key, "");
            });
        }

        // Subscribe to this content types data in the store
        this.parent.dataStore.subscribe(
            (data: DataObject) => {
                _.forEach(data, (value, key) => {
                    this.updateDataValue(key, value);
                });
            },
        );
    }

    /**
     * Does the current instance have any children or values different from the default for it's type?
     *
     * @returns {boolean}
     */
    protected isConfigured() {
        const data = this.parent.dataStore.get() as DataObject;
        let hasDataChanges = false;
        _.each(this.parent.config.fields, (field, key: string) => {
            if (this.fieldsToIgnoreOnRemove && this.fieldsToIgnoreOnRemove.includes(key)) {
                return;
            }
            let fieldValue = data[key];
            if (!fieldValue) {
                fieldValue = "";
            }
            // Default values can only ever be strings
            if (_.isObject(fieldValue)) {
                // Empty arrays as default values appear as empty strings
                if (_.isArray(fieldValue) && fieldValue.length === 0) {
                    fieldValue = "";
                } else {
                    fieldValue = JSON.stringify(fieldValue);
                }
            }
            if (_.isObject(field.default)) {
                if (JSON.stringify(field.default) !== fieldValue) {
                    hasDataChanges = true;
                }
            } else if (field.default !== fieldValue) {
                hasDataChanges = true;
            }
            return;
        });
        return hasDataChanges;
    }

    /**
     * Any hidden element should block drag / drop events from uploading images from the OS. We have to block this for
     * all elements as underlying elements could still receive the events if a parent is hidden.
     *
     * @param {Element} element
     */
    private disableImageUploadOnHide(element: Element) {
        $(element).on("drag dragstart dragend dragover dragenter dragleave drop", (event) => {
            if (this.display() === false) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

    /**
     * Update observables
     */
    private updateObservables(): void {
        this.observableUpdater.update(
            this,
            _.extend({}, this.parent.dataStore.get() as DataObject),
        );
        this.afterObservablesUpdated();
        events.trigger("previewData:updateAfter", {preview: this});
    }

    /**
     * Update placeholder background visibility base on height and padding
     *
     * @param {DataObject} data
     */
    private updatePlaceholderVisibility(data: DataObject): void {
        const minHeight = !_.isEmpty(data.min_height) ? parseFloat(data.min_height as string) : 130;
        const marginsAndPadding = _.isString(data.margins_and_padding) && data.margins_and_padding ?
            JSON.parse(data.margins_and_padding as string) :
            data.margins_and_padding || {};
        const padding = marginsAndPadding.padding || {};
        const paddingBottom = parseFloat(padding.bottom) || 0;
        const paddingTop = parseFloat(padding.top) || 0;

        this.isPlaceholderVisible(paddingBottom + paddingTop + minHeight >= 130);
    }
}