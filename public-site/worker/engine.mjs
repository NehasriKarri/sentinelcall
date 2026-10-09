// Worker port of backend/scam_detector.py. Match offsets are Unicode code points.
export function createEngine(data) {
 const rx=(p,flags='gu')=>new RegExp(p.replaceAll('(?<![\\w\\u0900-\\u097f])','(?<![\\p{L}\\p{N}_\\u0900-\\u097f])'),flags);
 function normalize(input){
  let value='',spans=[];
  Array.from(input).forEach((c,i)=>{for(const l of c.toLowerCase()){value+=/[\p{L}\p{N}'\u0900-\u097f]/u.test(l)?l:' ';spans.push([i,i+1]);}});
  for(const [p,replacement] of [[/\bo[ .-]*t[ .-]*p\b|\boh\s+tee\s+pee\b|ओ\s*टी\s*पी/gu,'otp'],[/\bp[ .-]+i[ .-]+n\b/gu,'pin'],[/\bc[ .-]+v[ .-]+v\b/gu,'cvv']]){
   for(const m of [...value.matchAll(p)].reverse()){const a=m.index,b=a+m[0].length,span=[spans[a][0],spans[b-1][1]];value=value.slice(0,a)+replacement+value.slice(b);spans.splice(a,b-a,...Array(replacement.length).fill(span));}
  }
  let text='',mapped=[];for(let i=0;i<value.length;i++){let c=value[i];if(/\s/u.test(c)){if(!text||text.endsWith(' '))continue;c=' ';}text+=c;mapped.push(spans[i]);}if(text.endsWith(' ')){text=text.slice(0,-1);mapped.pop();}return [text,mapped];
 }
 const norm=s=>normalize(s)[0];
 function actionable(t,start,end,category){
  const chars=Array.from(t), utfToPoint=n=>Array.from(t.slice(0,n)).length;
  const boundaries=[...t.matchAll(/[!?।;\n]|\.(?=\s|$)/gu)].map(m=>utfToPoint(m.index+m[0].length));
  const left=Math.max(0,...boundaries.filter(b=>b<=start)),right=Math.min(chars.length,...boundaries.filter(b=>b>=end));
  const sentenceRaw=chars.slice(left,right).join(''),sentence=norm(sentenceRaw),localStart=start-left,localEnd=end-left;
  let a=0,b=right-left;
  for(const m of sentenceRaw.matchAll(/,|\bbut\b|लेकिन|मगर|\blekin\b/giu)){const x=Array.from(sentenceRaw.slice(0,m.index)).length,y=x+Array.from(m[0]).length;if(y<=localStart)a=y;if(x>=localEnd){b=x;break;}}
  const clause=norm(chars.slice(left+a,left+b).join(''));
  if(rx(data.protective).test(clause)&&(category!=='secrecy_or_isolation'||/otp|pin|cvv|password|ओटीपी|पिन|पासवर्ड/u.test(clause)))return false;
  if(category==='otp_or_pin_request')return rx(data.sensitive).test(clause);
  if(category==='payment_or_transfer_request')return rx(data.payment).test(clause.replace(/google pay|gpay|phonepe|paytm/gu,''));
  if(category==='impersonation_of_authority'&&/\b(contact|report to|call the|reported to)\b|संपर्क करें|शिकायत करें/u.test(sentence))return false;
  return true;
 }
 function rules(transcript,lang='en'){
  const [text,spans]=normalize(transcript),chars=Array.from(transcript);let score=0;const categories=[],flagged=[];
  for(const [category,c] of Object.entries(data.rules)){
   const matches=[];for(const l of Object.values(c.languages))for(const p of l.patterns)for(const m of text.matchAll(rx(p))){const a=spans[m.index][0],b=spans[m.index+m[0].length-1][1];if(actionable(transcript,a,b,category))matches.push([a,b]);}
   if(!matches.length)continue;score+=c.weight;categories.push(category);const seen=new Set();for(const [a,b] of matches){if(seen.has(`${a}:${b}`))continue;seen.add(`${a}:${b}`);flagged.push({start:a,end:b,phrase:chars.slice(a,b).join(''),category,reason:c.languages[lang].explanation});}
  }return {score:Math.min(100,score),categories,flagged};
 }
 async function analyze(t,useAI=false,lang='en',env={}){
  const r=rules(t,lang);let output=null,status=useAI?'missing_key':'disabled';
  if(useAI&&env.GROQ_API_KEY){try{
   const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.GROQ_API_KEY}`},body:JSON.stringify({model:env.GROQ_MODEL||'llama-3.1-8b-instant',messages:[{role:'system',content:data.prompt},{role:'user',content:JSON.stringify({transcript:t,categories:r.categories,rule_score:r.score})}],temperature:.2,max_tokens:1400,response_format:{type:'json_object'}}),signal:AbortSignal.timeout(12000)});
   if(!res.ok){status=res.status===404?'invalid_model':'unavailable';}else{const body=await res.json(),o=JSON.parse(body.choices[0].message.content);const fields={explanation:2000,recommended_action:1000,explanation_hi:2000,recommended_action_hi:1000};if(!Number.isInteger(o.llm_score)||o.llm_score<0||o.llm_score>100||Object.entries(fields).some(([k,max])=>typeof o[k]!=='string'||!o[k].length||o[k].length>max)||Object.keys(o).length!==5){status='invalid_output';}else{output=o;status='used';}}
  }catch{status='unavailable';}}
  const score=output?Math.max(r.score,Math.round(.4*r.score+.6*output.llm_score)):r.score;
  const notices={disabled:['AI was not used. This check uses offline rules only.','AI का उपयोग नहीं हुआ। यह जांच केवल ऑफलाइन नियमों पर आधारित है।'],missing_key:['AI is not configured. This check uses rules only.','AI कॉन्फ़िगर नहीं है। यह जांच केवल नियमों पर आधारित है।'],invalid_output:['AI returned invalid data. This check uses rules only.','AI ने अमान्य डेटा लौटाया। यह जांच केवल नियमों पर आधारित है।'],invalid_model:['AI model is unavailable. This check uses rules only.','AI मॉडल उपलब्ध नहीं है। यह जांच केवल नियमों पर आधारित है।'],unavailable:['AI is temporarily unavailable. This check uses rules only.','AI फिलहाल उपलब्ध नहीं है। यह जांच केवल नियमों पर आधारित है।']};
  const localized={};for(const [l,i] of [['en',0],['hi',1]]){
   const findings=r.categories.map(c=>data.rules[c].languages[l].explanation).join(' ');
   const explanation=output?output[l==='en'?'explanation':'explanation_hi']:notices[status][i]+' '+(findings||(l==='en'?'No known warning signals were found. This does not establish that the caller is genuine.':'ज्ञात चेतावनी संकेत नहीं मिले। इससे कॉल करने वाले के असली होने की पुष्टि नहीं होती।'));
   const recommended_action=output?output[l==='en'?'recommended_action':'recommended_action_hi']:(l==='en'?(score>=35?'Do not share authentication details or pay this caller. Verify through an official channel.':'Verify unexpected requests using an official number you find independently.'):(score>=35?'सुरक्षा जानकारी या पैसे न दें। आधिकारिक माध्यम से स्वतंत्र रूप से सत्यापन करें।':'अचानक आए अनुरोधों की जांच खुद खोजे गए आधिकारिक नंबर से करें।'));
   localized[l]={explanation,recommended_action};
  }
  return {risk_level:score>=65?'high':score>=35?'medium':'low',risk_score:score,categories:r.categories,flagged_phrases:r.flagged,rule_score:r.score,llm_score:output?.llm_score??null,llm_status:status,localized,...localized[lang]};
 }
 return {rules,analyze};
}
