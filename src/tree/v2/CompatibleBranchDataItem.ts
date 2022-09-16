import { AzExtTreeItem, CompatibleQuickPickOptions, CreateOptions, isAzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { localize } from 'vscode-nls';
import { ApplicationResource, BranchDataProvider, ResourceModelBase } from '../../api/v2/v2AzureResourcesApi';
import { BranchDataItem, BranchDataItemOptions } from './BranchDataItem';
import { createBranchDataItemFactory } from './factories/branchDataItemFactory';
import { ResourceGroupsItem } from './ResourceGroupsItem';
import { ResourceGroupsItemCache } from './ResourceGroupsItemCache';

export class CompatibleBranchDataItem extends BranchDataItem {
    constructor(
        branchItem: ResourceModelBase,
        branchDataProvider: BranchDataProvider<ApplicationResource, ResourceModelBase>,
        itemCache: ResourceGroupsItemCache,
        options: BranchDataItemOptions | undefined
    ) {
        super(branchItem, branchDataProvider, itemCache, options);
        itemCache.addBranchItem(this.branchItem, this);
    }

    async getChildren(): Promise<ResourceGroupsItem[] | undefined> {
        const children = await this.branchDataProvider.getChildren(this.branchItem);
        const factory = createBranchDataItemFactory(this.itemCache);
        return children?.map(child => factory(child, this.branchDataProvider));
    }

    public get quickPickOptions(): CompatibleQuickPickOptions {
        const ti = this.branchItem as AzExtTreeItem;

        const createChild: CreateOptions | undefined = isAzExtParentTreeItem(ti) ?
            {
                callback: ti.createChild.bind(ti) as typeof ti.createChild,
                label: ti.childTypeLabel ?
                    localize('createNewItem', '$(plus) Create new {0}', ti.childTypeLabel) :
                    localize('createNew', '$(plus) Create new...'),
            } :
            undefined;

        return {
            contextValues: ti.contextValue.split(';'),
            isLeaf: !isAzExtParentTreeItem(ti),
            createChild,
        }
    }

    async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = await this.branchDataProvider.getTreeItem(this.branchItem);

        return {
            ...this.options?.defaults ?? {},
            ...treeItem
        }
    }

    unwrap<T>(): T {
        return this.branchItem as T;
    }

    id: string;
    name: string;
    type: string;
}
