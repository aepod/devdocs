/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

import events from "Magento_PageBuilder/js/events";
import _ from "underscore";
import Collection from "./collection";
import ContentType from "./content-type";
import ContentTypeCollectionInterface from "./content-type-collection.d";
import ContentTypeConfigInterface from "./content-type-config.d";
import ContentTypeInterface from "./content-type.d";

export default class ContentTypeCollection extends ContentType implements ContentTypeCollectionInterface {
    private collection: Collection = new Collection();

    /**
     * @param {ContentTypeInterface} parent
     * @param {ContentTypeConfigInterface} config
     * @param {string} stageId
     */
    constructor(
        parent: ContentTypeCollectionInterface,
        config: ContentTypeConfigInterface,
        stageId: string,
    ) {
        super(parent, config, stageId);
        this.collection.getChildren()
            .subscribe(
                () => events.trigger("stage:updateAfter", {stageId: this.stageId}),
            );
    }

    /**
     * Return the children of the current element
     *
     * @returns {KnockoutObservableArray<ContentTypeInterface | ContentTypeCollectionInterface>}
     */
    public getChildren(): KnockoutObservableArray<ContentTypeInterface | ContentTypeCollectionInterface> {
        return this.collection.getChildren();
    }

    /**
     * Add a child into the observable array
     *
     * @param {ContentTypeInterface | ContentTypeCollectionInterface} child
     * @param {number} index
     */
    public addChild(child: ContentTypeInterface | ContentTypeCollectionInterface, index?: number): void {
        child.parent = this;
        this.collection.addChild(child, index);

        // Trigger a mount event when a child is added into a parent, meaning it'll be re-rendered
        _.defer(() => {
            events.trigger("contentType:mountAfter", {id: child.id, contentType: child});
            events.trigger(child.config.name + ":mountAfter", {id: child.id, contentType: child});
        });
    }

    /**
     * Remove a child from the observable array
     *
     * @param child
     */
    public removeChild(child: any): void {
        this.collection.removeChild(child);
    }

    /**
     * Set the children observable array into the class
     *
     * @param children
     */
    public setChildren(children: KnockoutObservableArray<ContentTypeInterface | ContentTypeCollectionInterface>) {
        this.collection.setChildren(children);
    }

    get children(): KnockoutObservableArray<ContentTypeInterface | ContentTypeCollectionInterface> {
        return this.collection.getChildren();
    }
}