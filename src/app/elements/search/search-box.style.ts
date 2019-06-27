import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    --border-color:var(--color-theme);
    --color:inherit;
    --suggestion-bg-color:inherit;
    --suggestion-color:inherit;
    --suggestion-border-color:var(--background-theme-1);
    display: flex;
    flex-direction: column;
}

[aria-expanded=false] + [role=listbox]{
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

ul:empty, ol:empty {
    border-color: transparent;
}

[role=listbox] {
    list-style: none;
    margin: 0;
    overflow: scroll;
    padding: 0;
    width: 100%;
}

li {
    font-size: 0.95em;
    padding: 0.5em 1em;
    background: var(--suggestion-bg-color);
    color: var(--suggestion-color);
    transition: background-color 0.3s, color 0.3s;
}

li[aria-selected=true] {
    --suggestion-bg-color: var(--color-theme-1);
    --suggestion-color: var(--font-color-theme-2);
}

li:not(:last-child) {
    border-bottom: 1px solid var(--suggestion-border-color);
}

#my-location{
    --color: var(--color-theme-compl);
    align-self: center;
    margin: 0 0.4em;
}

@keyframes rotateSpinner {
    from {
        transform: rotateZ(0);
    }

    from {
        transform: rotateZ(360deg);
    }
}`;
