import {html, LitElement, css} from 'lit-element';
import {ToolType} from '../tools/interfaces';
import {Theme} from '../reducers/settings';

export const propDef = {};

export const template = () => {
    return html`
        <link rel="stylesheet" href="button-icon.css">
        <button><slot></slot></button>
`;
};

export class ButtonIcon extends LitElement {

    // static get styles(){
    //     return css``;
    // }

    static get properties() {
        return propDef;
    }

    constructor() {
        super();
    }

    render() {
        return template();
    }
}
