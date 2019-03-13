import {ServiceRegistry} from '../services/service-registry';
import {ToolType} from '../tools/interfaces';
import {Component} from './types';

const template = `<ul>
<li class="hidden tool-item">
    <button>Cancel</button>
</li>
<li class="tool-item">
    <button>Itinerary</button>
</li>
<li class="tool-item">
    <button>Search</button>
</li>
<li class="tool-item">
    <button>Settings</button>
</li>
</ul>
`;

export const factory = (registry: ServiceRegistry): Component => {
    const {navigation, store} = registry;
    const domElement = document.createElement('DIV');
    domElement.classList.add('tools-bar');
    domElement.innerHTML = template;

    let state = store.getState().tool;

    const [close, itenerary, search, settings] = Array.from(domElement.querySelectorAll('button'));

    close.addEventListener('click', ev => {
        navigation.unselectAll();
    });

    itenerary.addEventListener('click', ev => {
        navigation.selectTool(ToolType.ITINERARY);
    });

    search.addEventListener('click', ev => {
        navigation.selectTool(ToolType.SEARCH);
    });

    settings.addEventListener('click', ev => {
        navigation.selectTool(ToolType.SETTINGS);
    });

    const unsubscribe = store.subscribe(() => {
        const newState = store.getState().tool;
        if (newState.selectedTool !== state.selectedTool) {
            const {selectedTool} = newState;
            itenerary.parentElement.classList.toggle('selected', selectedTool === ToolType.ITINERARY);
            search.parentElement.classList.toggle('selected', selectedTool === ToolType.SEARCH);
            settings.parentElement.classList.toggle('selected', selectedTool === ToolType.SETTINGS);
            close.parentElement.classList.toggle('hidden', selectedTool === null);
        }
        state = newState;
    });

    return {
        clean() {
            unsubscribe();
        },
        dom() {
            return domElement;
        }
    };
};
