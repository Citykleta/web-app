import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    align-items: center;
    display: flex;
    justify-content: space-between;
}

:host(.removable) #remove-button {
    --size: 1.3rem;
}

:host(.removable) .drag-handle, :host(.removable) #remove-button {
    display: flex;
    margin: 0 0.5em;
}

#remove-button {
    display: none;
}

.drag-handle {
    display: none;
    width: 1rem;
    --color: var(--font-color-theme-1);
}

/**
todo display a drag area on host hover instead
 */
.drag-handle:hover {
    --color: var(--color-theme-compl);
    cursor: grab;
}

.drag-handle svg {
    fill: var(--color);
    stroke: var(--color);
}

citykleta-search-box {
    flex-grow: 1;
    margin: 0 0.5em;
}`;
