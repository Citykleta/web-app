import {ApplicationState} from './store';
import {Store} from 'redux';

export interface MapService {
    zoom(level: number): void;

    zoomIn(): void;

    zoomOut(): void;
}

export const provider = (store: Store<ApplicationState>): MapService => {
    return {
        zoom(level: number): void {
        },
        zoomIn(): void {
        },
        zoomOut(): void {
        }
    };
};
