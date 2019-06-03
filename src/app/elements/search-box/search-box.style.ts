import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    --background-color:inherit;
    --border-color:var(--color-theme);
    --color:inherit;
    --suggestion-bg-color:inherit;
    --suggestion-color:inherit;
    --suggestion-border-color:var(--background-theme-1);
    display: flex;
    flex-direction: column;
    position: relative;
}

[aria-expanded=false] + [role=listbox]{
    display: none;
}

:host(.overlay) [role=listbox]{
    background: inherit;
    box-shadow: 2px 2px 5px 0 var(--background-theme-3);
    position: absolute;
    top: 100%;
    z-index: 9;
}

[role=combobox] {
    border-bottom: 2px solid var(--border-color, currentColor);
    display: flex;
}

#loading-indicator {
    align-items: center;
    display: flex;
    padding: 2px;
    width: 2rem;
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
    font-weight: lighter;
    outline: none;
}

ul:empty, ol:empty {
    border-color: transparent;
}

ol {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
}

li {
    font-size: 0.95em;
    padding: 0.5em 1em;
    background: var(--suggestion-bg-color);
    color: var(--suggestion-color);
    transition: all 0.2s;
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
    margin: 0.2rem;
}

@keyframes rotateSpinner {
    from {
        transform: rotateZ(0);
    }

    from {
        transform: rotateZ(360deg);
    }
}`;
