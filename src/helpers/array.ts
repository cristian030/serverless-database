

export const intersection = (...arrays: string[][]) => {
  // if we process the arrays from shortest to longest
  // then we will identify failure points faster, i.e. when 
  // one item is not in all arrays
  const ordered = (arrays.length===1
      ? arrays : 
      arrays.sort((a1,a2) => a1.length - a2.length)),
    shortest = ordered[0],
    set = new Set(),      // used for bookeeping, Sets are faster
    result: string[] = [] // the intersection, conversion from Set is slow

  // for each item in the shortest array
  for(let i=0;i<shortest.length;i++) {
    const item = shortest[i]
    // ignore if already captured
    if (set.has(item)) continue
    // see if item is in every subsequent array
    let every = true // don't use ordered.every ... it is slow
    for(let j=1;j<ordered.length;j++) {
      if(ordered[j].includes(item)) continue
      every = false
      break
    }
    // ignore if not in every other array
    if(!every) continue
    // otherwise, add to bookeeping set and the result
    set.add(item)
    result.push(item) // result[result.length] = item
  }
  return result
}

