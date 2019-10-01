import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        --color: var(--color-theme-compl);
        --size: 1.8rem;
    }

    button {
        align-items: center;
        background: var(--background);
        border: 2px solid var(--color);
        border-radius: 50%;
        box-sizing: border-box;
        // box-shadow: 0 0 3px rgba(0, 0, 0, 0.3),
        // 0 0 4px rgba(0, 0, 0, 0.3),
        // 0 0 5px rgba(0, 0, 0, 0.2);
        color: var(--color);
        cursor: pointer;
        display: flex;
        height: var(--size);
        justify-content: center;
        outline: none;
        padding: 2px;
        transition: background 0.3s, color 0.3s;
        width: var(--size);
    }

    button:focus, button:hover {
        --background: var(--color-theme-compl);
        --color: var(--color-theme-compl-1);
        box-shadow: 0 0 4px 1px var(--background);
        color: var(--font-color-theme-2);
    }

    :host(.danger) {
        --color: var(--color-theme);
        --size: 1.5rem;
    }

    :host(.danger) button:focus, :host(.danger) button:hover {
        --background: var(--color-theme);
        --color: var(--color-theme-1);
        color: var(--font-color-theme-2);
    }

    ::slotted(svg) {
        background: transparent;
        fill: currentColor;
        stroke: currentColor;
        height: 100%;
        width: 100%;
    }
`;
