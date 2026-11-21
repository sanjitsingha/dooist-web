/** Where the side nav's open or collapsed choice is kept, in this browser. */
export const SIDEBAR_KEY = "dooist.sidebar";
export const SIDEBAR_ATTRIBUTE = "data-sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";

/** Runs before the first paint, so a collapsed side nav never flashes open on a reload. */
export const SIDEBAR_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(SIDEBAR_KEY)})===${JSON.stringify(SIDEBAR_COLLAPSED)})document.documentElement.setAttribute(${JSON.stringify(SIDEBAR_ATTRIBUTE)},${JSON.stringify(SIDEBAR_COLLAPSED)})}catch(e){}})()`;
