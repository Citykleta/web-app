import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    --border-color: var(--color-theme);
    --color: inherit;
    display: flex;
    flex-direction: column;
}

[aria-expanded=false] + [role=listbox] {
    display: none;
}

[role=combobox] {
    border-bottom: 2px solid var(--border-color);
    display: flex;
    padding: 0.4em;
}

#loading-indicator {
    align-items: center;
    display: flex;
    padding: 2px;
    width: 2em;
}

#loading-indicator > svg {
    animation: 1s linear rotateSpinner;
    animation-iteration-count: infinite;
    stroke: currentColor;
    fill: currentColor;
}

#loading-indicator.hidden > svg {
    visibility: hidden;
}

input {
    background: inherit;
    border: none;
    box-shadow: none;
    color: var(--color);
    flex-grow: 1;
    font-size: 0.9em;
    outline: none;
    padding: 0 0.2em;
}

#my-location {
    --color: var(--color-theme-compl);
    align-self: center;
    margin: 0 0.4em;
}

.municipality{
    font-size: 0.9em;
    margin: 0 0.5em;
    font-weight: 300;
}

@keyframes rotateSpinner {
    from {
        transform: rotateZ(0);
    }

    from {
        transform: rotateZ(360deg);
    }
}`;
