import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host > *:not(style) {
        display: flex;
        flex-direction: column;
    }
    
    #loading-indicator-container {
        background: var(--background-theme);
        height: 50px;
        padding: 8px;
    }

    #loading-indicator-container > svg {
        animation: 1s linear rotateSpinner;
        animation-iteration-count: infinite;
        stroke: currentColor;
        fill: currentColor;
    }

    @keyframes rotateSpinner {
        from {
            transform: rotateZ(0);
        }

        from {
            transform: rotateZ(360deg);
        }
    }`;
