import { GenericResource, ResourceGroup } from '@azure/arm-resources';
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { callWithTelemetryAndErrorHandling, IActionContext, ISubscriptionContext, nonNullProp } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { createResourceClient } from '../../../utils/azureClients';
import { getResourceGroupFromId } from '../../../utils/azureUtils';
import { ApplicationResource, ApplicationResourceProvider, ApplicationSubscription, ProvideResourceOptions } from '../v2AzureResourcesApi';

export class BuiltInApplicationResourceProvider implements ApplicationResourceProvider {
    private readonly onDidChangeResourceEmitter = new vscode.EventEmitter<ApplicationResource | undefined>();

    getResources(subscription: ApplicationSubscription, _options?: ProvideResourceOptions | undefined): Promise<ApplicationResource[] | undefined> {
        return callWithTelemetryAndErrorHandling(
            'provideResources',
            async (context: IActionContext) => {
                const subContext: ISubscriptionContext = {
                    subscriptionDisplayName: '',
                    subscriptionPath: '',
                    tenantId: '',
                    userId: '',
                    ...subscription
                };

                const client = await createResourceClient([context, subContext]);
                // Load more currently broken https://github.com/Azure/azure-sdk-for-js/issues/20380

                const allResources: GenericResource[] = await uiUtils.listAllIterator(client.resources.list());
                const appResources = allResources.map(resource => this.createAppResource(subscription, resource));

                const allResourceGroups: ResourceGroup[] = await uiUtils.listAllIterator(client.resourceGroups.list());
                const appResourcesResourceGroups = allResourceGroups.map(resource => this.fromResourceGroup(subscription, resource));

                return appResources.concat(appResourcesResourceGroups);
            });
    }

    onDidChangeResource = this.onDidChangeResourceEmitter.event;

    private fromResourceGroup(subscription: ApplicationSubscription, resourceGroup: ResourceGroup): ApplicationResource {
        return {
            subscription,
            id: nonNullProp(resourceGroup, 'id'),
            name: nonNullProp(resourceGroup, 'name'),
            type: nonNullProp(resourceGroup, 'type'),
            ...resourceGroup,
        };
    }

    private createAppResource(subscription: ApplicationSubscription, resource: GenericResource): ApplicationResource {
        const resourceId = nonNullProp(resource, 'id');

        return {
            subscription,
            id: resourceId,
            name: nonNullProp(resource, 'name'),
            type: nonNullProp(resource, 'type'),
            resourceGroup: getResourceGroupFromId(resourceId),
            kind: resource.kind,
            location: resource.location,
            ...resource
        };
    }
}
