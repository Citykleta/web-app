import {ServiceRegistry} from '../services/service-registry';
import {Component} from './interfaces';

const template = `<div class="input-container">
</div>`;

export const factory = (registry: ServiceRegistry): Component => {
    const container = document.createElement('div');
    container.classList.add('search-box');

    return {
        clean() {
        },
        dom() {
            return container;
        }
    };
};
