import $ from 'jquery';
import * as bootstrap from 'bootstrap';
import { gsap } from 'gsap';
import Viewer from 'viewerjs';

window.$ = window.jQuery = $;
window.bootstrap = bootstrap;
window.gsap = gsap;
window.Viewer = Viewer;

export { $, bootstrap, gsap, Viewer };
