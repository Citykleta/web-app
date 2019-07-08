import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    --background: var(--background-theme-1);
    font-weight: lighter;
    font-size: 0.95rem;
}

ul {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
}

li {
    background: var(--background);
    border-color: var(--background-theme-3, currentColor);
    border-style: solid;
    border-width: 2px 1px 0 0;
    box-shadow: 0 0 2px 0 var(--background-theme-2) inset;
    padding: 0.6em 2em;
    transition: margin 0.3s;
}

li:last-child {
    border-right-width: 0;
}

li.active {
    --background: var(--background-theme);
    border-top-color: var(--color-theme-1);
    box-shadow: none;
    font-weight: normal;
    margin-top: -0.2rem;
}`;
