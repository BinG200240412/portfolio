(() => {
  const SIZE = 64;
  // Real mesh projection and a depth buffer, then sampled into solid LEDs.
  // Facet lighting is quantised; neither pixels nor hues contain gradients.
  function render(id, time = 0, variant = 0, options = {}) {
    const input = options || {};
    const active = Number.isFinite(input.active) ? Math.max(0,Math.min(1,input.active)) : 0;
    const hover = !input.reduced && Number.isFinite(input.hover) ? Math.max(0,Math.min(1,input.hover)) : 0;
    const seconds = input.reduced ? 0 : Number.isFinite(time) ? time : 0;
    const reaction = active > 0 ? input.reduced ? .72 : Math.sin(active * Math.PI * .85) : 0;
    const mesh = window.PortfolioMatrixModels?.build(id, seconds, variant, input);
    const pixels = new Uint8Array(SIZE * SIZE), shades = new Uint8Array(SIZE * SIZE);
    if (!mesh) return { width:SIZE,height:SIZE,pixels,shades,model:true };
    const dog = id === 'robot-dog';
    const yaw = dog ? -.62 + .38 * Math.sin(seconds * .26 + variant * .2) + reaction * .13 : .12 + .42 * Math.sin(seconds * .24 + variant * .16) + reaction * .40 + hover * .06;
    const tilt = dog ? .25 + .04 * Math.sin(seconds * .3) : .19 + .08 * Math.sin(seconds * .29 + .4) + reaction * .22;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(tilt), sx = Math.sin(tilt);
    const rotated = mesh.vertices.map(([x,y,z]) => {
      const u = x * cy + z * sy, depth = -x * sy + z * cy;
      return [u, y * cx - depth * sx, y * sx + depth * cx];
    });
    const scale = dog ? 23 : 25;
    const projected = rotated.map(([x,y,z]) => {
      const perspective = 5 / (5 - z);
      return [SIZE / 2 + x * scale * perspective, SIZE / 2 - y * scale * perspective, z];
    });
    const depth = new Float32Array(SIZE * SIZE); depth.fill(-Infinity);
    for (const face of mesh.faces) {
      const indices = face.indices;
      if (indices.length < 3) continue;
      const a = rotated[indices[0]], b = rotated[indices[1]], c = rotated[indices[2]];
      const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2];
      const vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
      const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      const length = Math.hypot(nx,ny,nz) || 1;
      const lit = Math.abs((nx * -.39 + ny * .61 + nz * .69) / length);
      let shade = 1 + Math.min(3,Math.floor(lit * 4));
      // The headset's front shell gets one discrete light step; straps stay unchanged.
      const visor = !dog && face.role === 2 && indices.every(index => mesh.vertices[index][2] > .16);
      if (visor && reaction > .18) shade = Math.min(4,shade+1);
      for (let k=1;k<indices.length-1;k++) {
        const p=projected[indices[0]],q=projected[indices[k]],r=projected[indices[k+1]];
        const area=(q[1]-r[1])*(p[0]-r[0])+(r[0]-q[0])*(p[1]-r[1]);
        if (Math.abs(area)<1e-7) continue;
        const x0=Math.max(0,Math.floor(Math.min(p[0],q[0],r[0])));
        const x1=Math.min(SIZE-1,Math.ceil(Math.max(p[0],q[0],r[0])));
        const y0=Math.max(0,Math.floor(Math.min(p[1],q[1],r[1])));
        const y1=Math.min(SIZE-1,Math.ceil(Math.max(p[1],q[1],r[1])));
        for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++) {
          const px=x+.5,py=y+.5;
          const w0=((q[1]-r[1])*(px-r[0])+(r[0]-q[0])*(py-r[1]))/area;
          const w1=((r[1]-p[1])*(px-r[0])+(p[0]-r[0])*(py-r[1]))/area;
          const w2=1-w0-w1;
          if (w0<-.00001||w1<-.00001||w2<-.00001) continue;
          const z=w0*p[2]+w1*q[2]+w2*r[2], index=y*SIZE+x;
          if (z>=depth[index]) {depth[index]=z;pixels[index]=face.role;shades[index]=shade;}
        }
      }
    }
    return {width:SIZE,height:SIZE,pixels,shades,model:true};
  }
  window.PortfolioMatrix3D={ids:['robot-dog','quest-3'],render};
})();
