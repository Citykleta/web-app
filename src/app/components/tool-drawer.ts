import {Events, ToolSelectionState} from '../services/store';
import {factory as itineraryControl} from './itinerary-control';
import {ServiceRegistry} from '../services/service-registry';
import {ToolType} from '../tools/interfaces';
import {Component} from './interfaces';

const template = `<div class="tool-container"></div>`;
const hiddenClassName = 'hidden';

export const factory = (registry: ServiceRegistry): Component => {
    const {store} = registry;
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template;
    domElement.classList.add(hiddenClassName);
    domElement.setAttribute('id', 'toolbox-container');

    const toolContent = domElement.firstChild;
    let component: Component = null;

    const toolChangedHandler = async (state: ToolSelectionState) => {
        const {selectedTool} = state;
        const isOpen = selectedTool !== null;
        domElement.classList.toggle(hiddenClassName, isOpen === false);

        const range = document.createRange();
        range.selectNodeContents(toolContent);
        range.deleteContents();

        if (component) {
            component.clean();
            component = null;
        }

        if (isOpen) {
            // mount tool settings
            switch (selectedTool) {
                case ToolType.ITINERARY:
                    component = itineraryControl(registry);
                    toolContent.appendChild(component.dom());
                    break;
                default:
                    throw new Error('unknown tool');
            }
        }
    };
    store.on(Events.TOOL_CHANGED, toolChangedHandler);

    return {
        clean() {
            if (component) {
                component.clean();
            }
            store.off(Events.TOOL_CHANGED, toolChangedHandler);
        },
        dom() {
            return domElement;
        }
    };
};
