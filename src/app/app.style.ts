import {css} from 'lit-element';

// language=CSS
export const style = css`
    :host {
        color: var(--font-color-theme);
        padding: 0.6em;
        max-height: 100vh;
    }

    .panel {
        display: flex;
        flex-direction: column;
    }
    
    #loading-indicator, #spinner-container{
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    #loading-indicator{
        background: var(--background-theme);
        padding: 1em;
    }
    
    #loading-indicator span:last-child{
        height: 3em;
        width: 3em;
    }

    #loading-indicator  svg {
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
    }
`;
