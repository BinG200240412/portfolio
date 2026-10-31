/* Quiet library spines, painted onto the shared fixed LED hardware. */
(() => {
  'use strict';
  window.PortfolioCoverDots.register('archive', ({ctx,width,height,colors}) => {
    const sx = width / 128, sy = height / 46;
    const X = x => Math.round(x * sx), Y = y => Math.round(y * sy);
    function rect(x,y,w,h,role,alpha=1) {
      ctx.globalAlpha=alpha;ctx.fillStyle=colors[role];
      ctx.fillRect(X(x),Y(y),Math.max(1,X(x+w)-X(x)),Math.max(1,Y(y+h)-Y(y)));
    }
    function book(x,w,top,accent=false) {
      const h=39-top;
      rect(x,top,w,h,accent?3:0,accent?.55:.3);
      rect(x,top,1,h,1,.95);
      rect(x+1,top,w-2,1,1,.8);
      rect(x+w-2,top+1,2,h-1,0,.85);
      rect(x+1,38,w-2,1,1,.85);
      // Binding bands and an unlettered paper label read at small sizes.
      rect(x+2,top+4,w-5,1,accent?1:2,.9);
      rect(x+2,top+7,w-5,1,1,.65);
      if(w>12) {
        rect(x+3,top+12,w-7,5,1,.8);
        rect(x+4,top+14,w-9,1,0,1);
      } else {
        rect(x+3,top+12,2,8,1,.7);
      }
      rect(x+2,34,w-5,1,accent?1:2,.85);
    }
    book(7,14,10);
    book(24,17,4,true);
    book(44,11,12);
    book(58,16,7);
    // One leaning volume gives the shelf a recognisable library silhouette.
    ctx.save();
    ctx.translate(X(89),Y(39));
    ctx.rotate(-.23);
    ctx.globalAlpha=.4;ctx.fillStyle=colors[0];
    ctx.fillRect(0,-Y(31),X(13),Y(31));
    ctx.globalAlpha=.9;ctx.strokeStyle=colors[1];ctx.lineWidth=1;
    ctx.strokeRect(.5,-Y(31)+.5,Math.max(1,X(13)-1),Math.max(1,Y(31)-1));
    ctx.fillStyle=colors[2];ctx.fillRect(X(3),-Y(27),X(7),1);
    ctx.fillStyle=colors[1];ctx.fillRect(X(4),-Y(19),X(5),Y(5));
    ctx.restore();
    book(105,18,13);
    book(126,15,8);
    // A solid plinth anchors the volumes; it continues beyond the right crop.
    rect(0,40,142,1,1,.9);
    rect(0,41,142,2,0,.8);
    ctx.globalAlpha=1;
  }, {animated:false});
})();
