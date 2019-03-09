import {factory as itineraryControl} from './itinerary-control';
import {factory as searchControl} from './search-control';
import {ServiceRegistry} from '../services/service-registry';
import {ToolType} from '../tools/interfaces';
import {Component} from './types';
import {ToolBoxState} from '../reducers/tool-box';

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
    let state: ToolBoxState = store.getState().tool;

    const unsubscribe = store.subscribe(() => {
        //todo properly handle update condition;
        const newState = store.getState().tool;
        const shouldUpdate = newState.selectedTool !== state.selectedTool;
        state = newState;
        if (shouldUpdate) {
            const {selectedTool} = store.getState().tool;
            const isOpen = selectedTool !== null;
            domElement.classList.toggle(hiddenClassName, isOpen === false);

            const range = document.createRange();
            range.selectNodeContents(toolContent);
            range.deleteContents();

            if (component) {
                component.clean(); //this can trigger an infinite loop
                component = null;
            }

            if (isOpen) {
                // mount tool settings
                switch (selectedTool) {
                    case ToolType.ITINERARY:
                        component = itineraryControl(registry);
                        toolContent.appendChild(component.dom());
                        break;
                    case ToolType.SEARCH:
                        component = searchControl(registry);
                        toolContent.appendChild(component.dom());
                        break;
                    default:
                        throw new Error('unknown tool');
                }
            }
        }
    });

    return {
        clean() {
            if (component) {
                component.clean();
            }
            unsubscribe();
        },
        dom() {
            return domElement;
        }
    };
};
