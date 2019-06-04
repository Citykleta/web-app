import {css} from 'lit-element';

// language=CSS
export const style = css`:host {
    --background-color: var(--background-theme-1);
    --border-color: var(--background-theme-3, currentColor);
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
    background: var(--background-color);
    padding: 0.7rem 1rem;
    border-style: solid;
    border-width: 2px 1px 0 0;
    border-color: var(--border-color);
    box-shadow: 0 0 2px 0 var(--background-theme-2) inset;
    transition: margin 0.3s;
}

li:last-child {
    border-right-width: 0;
}

li.active {
    --background-color: var(--background-theme);
    border-top-color: var(--color-theme-1);
    box-shadow: none;
    font-weight: normal;
    margin-top: -0.2rem;
}`;
