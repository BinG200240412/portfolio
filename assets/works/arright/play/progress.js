// Preserve the previous attempt when a puzzle's public rules change.
export function revisionRecord(q,saved){
 const revision=q.revision||1;
 if(!saved)return {revision,revisionChanged:false,previousRevisions:[]};
 const previous=saved.revision||1;
 if(previous===revision)return {...saved,revision,revisionChanged:false};
 return {...saved,revision,revisionChanged:true,state:null,previousRevisions:[...(saved.previousRevisions||[]),{revision:previous,state:saved.state,note:saved.note||'',actions:saved.actions||[]}]};
}
