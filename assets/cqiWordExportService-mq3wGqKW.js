import{c as ce}from"./index-B_eamI5z.js";import{j as W,e as ne,C as he,x as be,f as Z,y as ie,b as z,L as G,k as U,z as ve,S as Ae,A as ye,F as Ce,a as ae,d as Se,i as _,H as Ee,g as Ie,u as Te,G as $e,I as J,v as Oe,s as Pe,J as we,K as Y,M as re,n as Re,P as Ne,w as xe,N as Me}from"./BarChart-EfsnI36L.js";import{R as N,r as ke}from"./vendor-syncfusion-DyaZc6kb.js";import{B as de}from"./baiustLogo-t__Yb9uD.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ye=ce("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ze=ce("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);var X;function Q(n){"@babel/helpers - typeof";return Q=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},Q(n)}function j(){return j=Object.assign?Object.assign.bind():function(n){for(var t=1;t<arguments.length;t++){var o=arguments[t];for(var e in o)Object.prototype.hasOwnProperty.call(o,e)&&(n[e]=o[e])}return n},j.apply(this,arguments)}function se(n,t){var o=Object.keys(n);if(Object.getOwnPropertySymbols){var e=Object.getOwnPropertySymbols(n);t&&(e=e.filter(function(i){return Object.getOwnPropertyDescriptor(n,i).enumerable})),o.push.apply(o,e)}return o}function C(n){for(var t=1;t<arguments.length;t++){var o=arguments[t]!=null?arguments[t]:{};t%2?se(Object(o),!0).forEach(function(e){x(n,e,o[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(n,Object.getOwnPropertyDescriptors(o)):se(Object(o)).forEach(function(e){Object.defineProperty(n,e,Object.getOwnPropertyDescriptor(o,e))})}return n}function Le(n,t){if(!(n instanceof t))throw new TypeError("Cannot call a class as a function")}function le(n,t){for(var o=0;o<t.length;o++){var e=t[o];e.enumerable=e.enumerable||!1,e.configurable=!0,"value"in e&&(e.writable=!0),Object.defineProperty(n,ue(e.key),e)}}function Be(n,t,o){return t&&le(n.prototype,t),o&&le(n,o),Object.defineProperty(n,"prototype",{writable:!1}),n}function De(n,t,o){return t=q(t),Fe(n,me()?Reflect.construct(t,o||[],q(n).constructor):t.apply(n,o))}function Fe(n,t){if(t&&(Q(t)==="object"||typeof t=="function"))return t;if(t!==void 0)throw new TypeError("Derived constructors may only return object or undefined");return Ue(n)}function Ue(n){if(n===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return n}function me(){try{var n=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return(me=function(){return!!n})()}function q(n){return q=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(o){return o.__proto__||Object.getPrototypeOf(o)},q(n)}function _e(n,t){if(typeof t!="function"&&t!==null)throw new TypeError("Super expression must either be null or a function");n.prototype=Object.create(t&&t.prototype,{constructor:{value:n,writable:!0,configurable:!0}}),Object.defineProperty(n,"prototype",{writable:!1}),t&&oe(n,t)}function oe(n,t){return oe=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,i){return e.__proto__=i,e},oe(n,t)}function x(n,t,o){return t=ue(t),t in n?Object.defineProperty(n,t,{value:o,enumerable:!0,configurable:!0,writable:!0}):n[t]=o,n}function ue(n){var t=je(n,"string");return Q(t)=="symbol"?t:t+""}function je(n,t){if(Q(n)!="object"||!n)return n;var o=n[Symbol.toPrimitive];if(o!==void 0){var e=o.call(n,t);if(Q(e)!="object")return e;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(n)}var D=function(n){function t(o){var e;return Le(this,t),e=De(this,t,[o]),x(e,"pieRef",null),x(e,"sectorRefs",[]),x(e,"id",Te("recharts-pie-")),x(e,"handleAnimationEnd",function(){var i=e.props.onAnimationEnd;e.setState({isAnimationFinished:!0}),W(i)&&i()}),x(e,"handleAnimationStart",function(){var i=e.props.onAnimationStart;e.setState({isAnimationFinished:!1}),W(i)&&i()}),e.state={isAnimationFinished:!o.isAnimationActive,prevIsAnimationActive:o.isAnimationActive,prevAnimationId:o.animationId,sectorToFocus:0},e}return _e(t,n),Be(t,[{key:"isActiveIndex",value:function(e){var i=this.props.activeIndex;return Array.isArray(i)?i.indexOf(e)!==-1:e===i}},{key:"hasActiveIndex",value:function(){var e=this.props.activeIndex;return Array.isArray(e)?e.length!==0:e||e===0}},{key:"renderLabels",value:function(e){var i=this.props.isAnimationActive;if(i&&!this.state.isAnimationFinished)return null;var c=this.props,s=c.label,g=c.labelLine,f=c.dataKey,r=c.valueKey,h=Z(this.props,!1),d=Z(s,!1),b=Z(g,!1),v=s&&s.offsetRadius||20,a=e.map(function(l,A){var m=(l.startAngle+l.endAngle)/2,E=ie(l.cx,l.cy,l.outerRadius+v,m),I=C(C(C(C({},h),l),{},{stroke:"none"},d),{},{index:A,textAnchor:t.getTextAnchor(E.x,l.cx)},E),R=C(C(C(C({},h),l),{},{fill:"none",stroke:l.fill},b),{},{index:A,points:[ie(l.cx,l.cy,l.outerRadius,m),E]}),$=f;return z(f)&&z(r)?$="value":z(f)&&($=r),N.createElement(G,{key:"label-".concat(l.startAngle,"-").concat(l.endAngle,"-").concat(l.midAngle,"-").concat(A)},g&&t.renderLabelLineItem(g,R,"line"),t.renderLabelItem(s,I,U(l,$)))});return N.createElement(G,{className:"recharts-pie-labels"},a)}},{key:"renderSectorsStatically",value:function(e){var i=this,c=this.props,s=c.activeShape,g=c.blendStroke,f=c.inactiveShape;return e.map(function(r,h){if((r==null?void 0:r.startAngle)===0&&(r==null?void 0:r.endAngle)===0&&e.length!==1)return null;var d=i.isActiveIndex(h),b=f&&i.hasActiveIndex()?f:null,v=d?s:b,a=C(C({},r),{},{stroke:g?r.fill:r.stroke,tabIndex:-1});return N.createElement(G,j({ref:function(A){A&&!i.sectorRefs.includes(A)&&i.sectorRefs.push(A)},tabIndex:-1,className:"recharts-pie-sector"},ve(i.props,r,h),{key:"sector-".concat(r==null?void 0:r.startAngle,"-").concat(r==null?void 0:r.endAngle,"-").concat(r.midAngle,"-").concat(h)}),N.createElement(Ae,j({option:v,isActive:d,shapeType:"sector"},a)))})}},{key:"renderSectorsWithAnimation",value:function(){var e=this,i=this.props,c=i.sectors,s=i.isAnimationActive,g=i.animationBegin,f=i.animationDuration,r=i.animationEasing,h=i.animationId,d=this.state,b=d.prevSectors,v=d.prevIsAnimationActive;return N.createElement(ye,{begin:g,duration:f,isActive:s,easing:r,from:{t:0},to:{t:1},key:"pie-".concat(h,"-").concat(v),onAnimationStart:this.handleAnimationStart,onAnimationEnd:this.handleAnimationEnd},function(a){var l=a.t,A=[],m=c&&c[0],E=m.startAngle;return c.forEach(function(I,R){var $=b&&b[R],w=R>0?Ce(I,"paddingAngle",0):0;if($){var O=ae($.endAngle-$.startAngle,I.endAngle-I.startAngle),p=C(C({},I),{},{startAngle:E+w,endAngle:E+O(l)+w});A.push(p),E=p.endAngle}else{var S=I.endAngle,T=I.startAngle,K=ae(0,S-T),L=K(l),M=C(C({},I),{},{startAngle:E+w,endAngle:E+L+w});A.push(M),E=M.endAngle}}),N.createElement(G,null,e.renderSectorsStatically(A))})}},{key:"attachKeyboardHandlers",value:function(e){var i=this;e.onkeydown=function(c){if(!c.altKey)switch(c.key){case"ArrowLeft":{var s=++i.state.sectorToFocus%i.sectorRefs.length;i.sectorRefs[s].focus(),i.setState({sectorToFocus:s});break}case"ArrowRight":{var g=--i.state.sectorToFocus<0?i.sectorRefs.length-1:i.state.sectorToFocus%i.sectorRefs.length;i.sectorRefs[g].focus(),i.setState({sectorToFocus:g});break}case"Escape":{i.sectorRefs[i.state.sectorToFocus].blur(),i.setState({sectorToFocus:0});break}}}}},{key:"renderSectors",value:function(){var e=this.props,i=e.sectors,c=e.isAnimationActive,s=this.state.prevSectors;return c&&i&&i.length&&(!s||!Se(s,i))?this.renderSectorsWithAnimation():this.renderSectorsStatically(i)}},{key:"componentDidMount",value:function(){this.pieRef&&this.attachKeyboardHandlers(this.pieRef)}},{key:"render",value:function(){var e=this,i=this.props,c=i.hide,s=i.sectors,g=i.className,f=i.label,r=i.cx,h=i.cy,d=i.innerRadius,b=i.outerRadius,v=i.isAnimationActive,a=this.state.isAnimationFinished;if(c||!s||!s.length||!_(r)||!_(h)||!_(d)||!_(b))return null;var l=ne("recharts-pie",g);return N.createElement(G,{tabIndex:this.props.rootTabIndex,className:l,ref:function(m){e.pieRef=m}},this.renderSectors(),f&&this.renderLabels(s),Ee.renderCallByParent(this.props,null,!1),(!v||a)&&Ie.renderCallByParent(this.props,s,!1))}}],[{key:"getDerivedStateFromProps",value:function(e,i){return i.prevIsAnimationActive!==e.isAnimationActive?{prevIsAnimationActive:e.isAnimationActive,prevAnimationId:e.animationId,curSectors:e.sectors,prevSectors:[],isAnimationFinished:!0}:e.isAnimationActive&&e.animationId!==i.prevAnimationId?{prevAnimationId:e.animationId,curSectors:e.sectors,prevSectors:i.curSectors,isAnimationFinished:!0}:e.sectors!==i.curSectors?{curSectors:e.sectors,isAnimationFinished:!0}:null}},{key:"getTextAnchor",value:function(e,i){return e>i?"start":e<i?"end":"middle"}},{key:"renderLabelLineItem",value:function(e,i,c){if(N.isValidElement(e))return N.cloneElement(e,i);if(W(e))return e(i);var s=ne("recharts-pie-label-line",typeof e!="boolean"?e.className:"");return N.createElement(he,j({},i,{key:c,type:"linear",className:s}))}},{key:"renderLabelItem",value:function(e,i,c){if(N.isValidElement(e))return N.cloneElement(e,i);var s=c;if(W(e)&&(s=e(i),N.isValidElement(s)))return s;var g=ne("recharts-pie-label-text",typeof e!="boolean"&&!W(e)?e.className:"");return N.createElement(be,j({},i,{alignmentBaseline:"middle",className:g}),s)}}])}(ke.PureComponent);X=D;x(D,"displayName","Pie");x(D,"defaultProps",{stroke:"#fff",fill:"#808080",legendType:"rect",cx:"50%",cy:"50%",startAngle:0,endAngle:360,innerRadius:0,outerRadius:"80%",paddingAngle:0,labelLine:!0,hide:!1,minAngle:0,isAnimationActive:!$e.isSsr,animationBegin:400,animationDuration:1500,animationEasing:"ease",nameKey:"name",blendStroke:!1,rootTabIndex:0});x(D,"parseDeltaAngle",function(n,t){var o=J(t-n),e=Math.min(Math.abs(t-n),360);return o*e});x(D,"getRealPieData",function(n){var t=n.data,o=n.children,e=Z(n,!1),i=Oe(o,Pe);return t&&t.length?t.map(function(c,s){return C(C(C({payload:c},e),c),i&&i[s]&&i[s].props)}):i&&i.length?i.map(function(c){return C(C({},e),c.props)}):[]});x(D,"parseCoordinateOfPie",function(n,t){var o=t.top,e=t.left,i=t.width,c=t.height,s=we(i,c),g=e+Y(n.cx,i,i/2),f=o+Y(n.cy,c,c/2),r=Y(n.innerRadius,s,0),h=Y(n.outerRadius,s,s*.8),d=n.maxRadius||Math.sqrt(i*i+c*c)/2;return{cx:g,cy:f,innerRadius:r,outerRadius:h,maxRadius:d}});x(D,"getComposedData",function(n){var t=n.item,o=n.offset,e=t.type.defaultProps!==void 0?C(C({},t.type.defaultProps),t.props):t.props,i=X.getRealPieData(e);if(!i||!i.length)return null;var c=e.cornerRadius,s=e.startAngle,g=e.endAngle,f=e.paddingAngle,r=e.dataKey,h=e.nameKey,d=e.valueKey,b=e.tooltipType,v=Math.abs(e.minAngle),a=X.parseCoordinateOfPie(e,o),l=X.parseDeltaAngle(s,g),A=Math.abs(l),m=r;z(r)&&z(d)?(re(!1,`Use "dataKey" to specify the value of pie,
      the props "valueKey" will be deprecated in 1.1.0`),m="value"):z(r)&&(re(!1,`Use "dataKey" to specify the value of pie,
      the props "valueKey" will be deprecated in 1.1.0`),m=d);var E=i.filter(function(p){return U(p,m,0)!==0}).length,I=(A>=360?E:E-1)*f,R=A-E*v-I,$=i.reduce(function(p,S){var T=U(S,m,0);return p+(_(T)?T:0)},0),w;if($>0){var O;w=i.map(function(p,S){var T=U(p,m,0),K=U(p,h,S),L=(_(T)?T:0)/$,M;S?M=O.endAngle+J(l)*f*(T!==0?1:0):M=s;var V=M+J(l)*((T!==0?v:0)+L*R),u=(M+V)/2,y=(a.innerRadius+a.outerRadius)/2,B=[{name:K,value:T,payload:p,dataKey:m,type:b}],k=ie(a.cx,a.cy,y,u);return O=C(C(C({percent:L,cornerRadius:c,name:K,tooltipPayload:B,midAngle:u,middleRadius:y,tooltipPosition:k},p),a),{},{value:U(p,m),startAngle:M,endAngle:V,payload:p,paddingAngle:J(l)*f}),O})}return C(C({},a),{},{sectors:w,data:i})});var Je=Re({chartName:"PieChart",GraphicalChild:D,validateTooltipEventTypes:["item"],defaultTooltipEventType:"item",legendContent:"children",axisComponents:[{axisType:"angleAxis",AxisComp:Ne},{axisType:"radiusAxis",AxisComp:xe}],formatAxisMap:Me,defaultProps:{layout:"centric",startAngle:0,endAngle:360,cx:"50%",cy:"50%",innerRadius:0,outerRadius:"80%"}}),ze={};const F={PO1:"Engineering knowledge",PO2:"Problem analysis",PO3:"Design/development of solutions",PO4:"Investigation",PO5:"Modern tool usage",PO6:"The engineer and society",PO7:"Environment & sustainability",PO8:"Ethics",PO9:"Individual work and teamwork",PO10:"Communication",PO11:"Project management and finance",PO12:"Life-long learning"};function pe(n="",t=""){const o=(n||"").trim();let e=parseInt(String(t).replace(/\D/g,""),10);if(isNaN(e)||e<2e3){const i=o.match(/(\d{4})/);i?e=parseInt(i[1],10):e=new Date().getFullYear()}return/spring/i.test(o)?`Fall ${e}`:/fall|autumn/i.test(o)?`Spring ${e+1}`:/summer/i.test(o)?`Fall ${e}`:`Fall ${e}`}async function ge(n){var c,s,g,f,r;const t=((typeof process<"u"?ze.GEMINI_API_KEY:"")||localStorage.getItem("OBE_GEMINI_API_KEY")||"").trim();let o="";try{const h=localStorage.getItem("obe-auth-token"),b=typeof window<"u"&&!window.location.hostname.includes("localhost")&&!window.location.hostname.includes("127.0.0.1")?"https://student-outcome-analyzer-api.onrender.com":"",v=await fetch(`${b}/api/ai/swot-generate`,{method:"POST",headers:{"Content-Type":"application/json",...h?{Authorization:`Bearer ${h}`}:{}},body:JSON.stringify({promptText:n})});if(v.ok){const a=await v.json();a.success&&a.content&&(o=a.content)}}catch(h){console.warn("[CQI-AI] Backend proxy unavailable, attempting direct client fallback:",h.message)}if(!o&&t){const h=[`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(t)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(t)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${encodeURIComponent(t)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(t)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(t)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(t)}`];for(const d of h)try{const b=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:n}]}],generationConfig:{temperature:.75,maxOutputTokens:2500}})}),v=await b.json();if(b.ok&&((r=(f=(g=(s=(c=v.candidates)==null?void 0:c[0])==null?void 0:s.content)==null?void 0:g.parts)==null?void 0:f[0])!=null&&r.text)){o=v.candidates[0].content.parts[0].text;break}}catch(b){console.warn("[CQI-AI] Direct client endpoint failed:",b.message)}}if(!o)throw new Error("No AI response received from backend proxy or direct Gemini endpoints.");const e=o.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim(),i=JSON.parse(e);return H(i)}function H(n){if(typeof n=="string")return n.replace(/\bRevise course syllabi\b/gi,"Revise course syllabus").replace(/\bcourse syllabi\b/gi,"course syllabus").replace(/\bunseen course syllabi\b/gi,"unseen course syllabuses").replace(/\bsyllabi\b/gi,"course syllabus").replace(/\bthe the\b/gi,"the").replace(/\ba a\b/gi,"a").replace(/\ban an\b/gi,"an").replace(/\bbench-marked\b/gi,"benchmarked").replace(/\bbench-mark\b/gi,"benchmark").replace(/\bBloom levels\b/gi,"Bloom's Taxonomy levels").replace(/\bBlooms Taxonomy\b/gi,"Bloom's Taxonomy");if(Array.isArray(n))return n.map(H);if(n!==null&&typeof n=="object"){const t={};for(const o of Object.keys(n))t[o]=H(n[o]);return t}return n}async function Xe({offeringId:n="default",courseCode:t="Course",courseTitle:o="Course Title",semesterName:e="Semester",academicYear:i="",sectionName:c="A",targetPassMarks:s=40,kpiCO:g=50,kpiPO:f=50,activeCOs:r=[],activePOs:h=[],calculations:d={},coDescriptions:b={},poDescriptions:v={},forceRegenerate:a=!1,customTeacherNotes:l=""}){const A=`BAETE_COURSE_CQI_${n}_${t}_${s}_${g}_${f}_v3`;if(!a)try{const u=localStorage.getItem(A);if(u){const y=JSON.parse(u);if(y!=null&&y.summary&&(y!=null&&y.remediations))return{...y,aiSource:y.aiSource||"cached"}}}catch(u){console.warn("[CQI-AI] Error reading course CQI cache:",u)}const m=(d==null?void 0:d.coAttainment)||{},E=(d==null?void 0:d.poAttainment)||{},I=r.map(u=>{const y=m[u]||{},B=Math.round((y.passMarksPercentage||0)*10)/10,k=Math.round((y.kpiPercentage||0)*10)/10,ee=b[u]||"",te=Math.round((g-k)*10)/10;return{co:u,desc:ee,passPct:B,kpiPct:k,gap:te,isMet:k>=g}}),R=h.map(u=>{const y=E[u]||{},B=Math.round((y.passMarksPercentage||0)*10)/10,k=Math.round((y.kpiPercentage||0)*10)/10,ee=v[u]||F[u]||"",te=Math.round((f-k)*10)/10;return{po:u,desc:ee,passPct:B,kpiPct:k,gap:te,isMet:k>=f}}),$=Array.from({length:6},(u,y)=>`CO${y+1}`).filter(u=>!r.includes(u)),w=Array.from({length:12},(u,y)=>`PO${y+1}`).filter(u=>!h.includes(u)),O=pe(e,i),p=I.filter(u=>!u.isMet),S=R.filter(u=>!u.isMet),T=p.length===0&&S.length===0,L=[...I].sort((u,y)=>u.kpiPct-y.kpiPct)[0],M=T?`ATTAINMENT STATUS: SCENARIO B (PROACTIVE / HIGH-PERFORMING CASE - ALL OUTCOMES ATTAINED)
- All evaluated COs and POs met or surpassed their KPI benchmarks (${g}% for COs, ${f}% for POs).
- MANDATORY TONE & VOCABULARY RESTRICTION: DO NOT use harsh words like "deficit", "failure", "unmet", or "root cause of failure".
- Frame the analysis under Proactive Continuous Quality Improvement and Continuous Enhancement.
- In "rootCauses" (which maps to Section 1 sub-label "IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:"), highlight relative comprehension bottlenecks (e.g., identifying why an outcome among the attained outcomes like ${L?`${L.co} at ${L.kpiPct}%`:"CO2 at 79.3%"} was slightly lower than other COs at 100%) and examine challenging conceptual topics that required disproportionate student effort.
- In "remediations" and "actionPlanForNextSemester", propose proactive pedagogical enhancements, advanced industry-aligned complex engineering problem modules (WP1-WP4), and honors-level problem decomposition to elevate future benchmark targets beyond current baselines.`:`ATTAINMENT STATUS: SCENARIO A (DEFICIT CASE - AT LEAST ONE OUTCOME UNMET)
- At least one CO or PO failed to meet target KPI benchmarks (${g}% for COs, ${f}% for POs). Deficit outcomes: ${[...p.map(u=>`${u.co} (${u.kpiPct}%)`),...S.map(u=>`${u.po} (${u.kpiPct}%)`)].join(", ")}.
- Perform an evidence-based Root Cause Analysis (RCA) focusing strictly on why specific COs/POs failed to meet target thresholds (e.g. cognitive taxonomy mismatch, insufficient lab drill hours, theoretical abstraction, assessment ambiguity).
- Propose concrete, corrective pedagogical remediations, rubric realignments, and remedial clinic hours to close the loop in ${O}.`,V=`System Role: You are a Senior Academic OBE Accreditation Consultant and BAETE Program Evaluator at Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.
TASK: Generate an official BAETE Criterion 9.2 "Course Continuous Quality Improvement (CQI) Action Plan & Closing-the-Loop Report" for:
- Course: ${t} - ${o}
- Current Semester: ${e} ${i}, Section: ${c}
- Subsequent Re-Assessment Semester: ${O} (CRITICAL: University semester sequence is strictly Spring YYYY -> Fall YYYY -> Spring YYYY+1. Current is ${e} ${i}, so next is STRICTLY ${O}. Do not jump years!)
- Assessment Benchmarks: Target Pass Mark = ${s}%, Course KPI = ${g}%, Program KPI = ${f}%

${M}

CURRENT ATTAINMENT DATA:
Course Outcomes (COs):
${I.map(u=>`- ${u.co} (${u.desc}): Pass Rate=${u.passPct}%, KPI Attainment=${u.kpiPct}% (Status: ${u.isMet?"MET":`DEFICIT -${u.gap}%`})`).join(`
`)}
${$.length>0?`Unassessed / Zero COs in syllabus: ${$.join(", ")}`:""}

Program Outcomes (POs) Mapped to this Course:
${R.map(u=>`- ${u.po} (${u.desc}): Pass Rate=${u.passPct}%, KPI Attainment=${u.kpiPct}% (Status: ${u.isMet?"MET":`DEFICIT -${u.gap}%`})`).join(`
`)}
${w.length>0?`POs Not Mapped to this Course: ${w.join(", ")}`:""}

${l?`TEACHER'S RECENT OBSERVATIONS / DRAFT NOTES:
${l}
`:""}

REQUIREMENTS FOR BAETE CRITERION 9 COMPLIANCE:
1. "summary": A concise academic executive summary (80-120 words) analyzing whether this offering successfully closed the learning loop. ${T?"Highlight cognitive strengths and state proactive enhancement strategies to elevate future performance.":"Identify key cognitive strengths and deficit bottlenecks requiring targeted corrective action."}
2. "rootCauses": Array of 2-3 specific bullet points. ${T?'Highlight relative comprehension bottlenecks or opportunities for continuous pedagogical enhancement (DO NOT mention "failure" or "deficit").':"Explain specific root causes for why students struggled with the lowest COs/POs (e.g. cognitive taxonomy mismatch, insufficient lab drill hours, theoretical abstraction, assessment ambiguity)."}
3. "remediations": Array of actionable pedagogical interventions. ${T?"Propose continuous enrichment modules for the outcomes with relative room for growth to sustain high achievement and elevate future targets.":"For every CO or PO that fell below the KPI threshold (or had 0% attainment), provide targeted remediation."}
   - "code": Outcome identifier (e.g. "CO5" or "PO10")
   - "title": Specific technical intervention title tailored to "${o}"
   - "action": 2-3 lines of high-impact pedagogical remediation or enhancement (e.g., rubrics redesign, tutorial problem sessions, hands-on tool practicals, revised midterm question decomposition).
   - "category": One of ["Assessment Refinement", "Laboratory/Tool Practice", "Pedagogical Delivery", "Remedial Clinics"]
4. "actionPlanForNextSemester": Exactly 3-4 bullet-point operational commitments the course instructor must implement in the next offering (${O}) to close the loop.
5. "closingTheLoopTarget": Expected quantitative attainment target for the next offering specifically in ${O} (e.g., "${T?`Aim to elevate cohort benchmark to ≥ ${Math.min(g+5,85)}% in ${O} through advanced design rubric integration`:`Aim to elevate student attainment to ≥ 70% in ${O} through dedicated lab rubric integration`}").
6. "meetingMinutesDraft": A short template text of Course Assessment Committee (CAC) discussion minutes for ${t} in ${O} that the teacher can print, edit, or file.

OUTPUT FORMAT: Return ONLY a valid JSON object matching this structure without markdown code blocks:
{
  "summary": "...",
  "rootCauses": ["...", "..."],
  "remediations": [
    {
      "code": "CO5",
      "title": "...",
      "action": "...",
      "category": "Laboratory/Tool Practice"
    }
  ],
  "actionPlanForNextSemester": ["...", "..."],
  "closingTheLoopTarget": "...",
  "meetingMinutesDraft": "..."
}`;try{const y={...await ge(V),aiSource:"gemini",generatedAt:new Date().toISOString(),courseCode:t,courseTitle:o,semester:`${e} ${i}`,thresholds:{targetPassMarks:s,kpiCO:g,kpiPO:f},allAttained:T,section1Title:T?"1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS":"1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)",section1Sublabel:T?"IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:":"IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:"};try{localStorage.setItem(A,JSON.stringify(y))}catch(B){console.warn("[CQI-AI] Failed saving course CQI to localStorage:",B)}return y}catch(u){console.warn("[CQI-AI] Gemini call failed, generating academic heuristic fallback:",u.message);const y=Qe({courseCode:t,courseTitle:o,semesterName:e,academicYear:i,sectionName:c,targetPassMarks:s,kpiCO:g,kpiPO:f,coBreakdown:I,poBreakdown:R,unassessedCOs:$,unassessedPOs:w});try{localStorage.setItem(A,JSON.stringify(y))}catch{}return y}}function Qe({courseCode:n,courseTitle:t,semesterName:o,academicYear:e,sectionName:i,targetPassMarks:c,kpiCO:s,kpiPO:g,coBreakdown:f,poBreakdown:r,unassessedCOs:h,unassessedPOs:d}){const b=f.filter(p=>!p.isMet),v=r.filter(p=>!p.isMet),a=b.length===0&&v.length===0,l=pe(o,e),m=[...f].sort((p,S)=>p.kpiPct-S.kpiPct)[0],E=[];if(a){const p=m?m.co:"Continuous Excellence",S=m?`${m.kpiPct}%`:"the benchmark";E.push({code:p,title:`Advanced Competency Enrichment for ${t}`,action:`All evaluated outcomes surpassed the ${s}% benchmark (with ${p} attaining ${S}). Introduce industry-aligned complex engineering problem modules (WP1-WP4) and enhanced open-ended design problems to elevate future cohort attainment targets in ${l}.`,category:"Pedagogical Delivery"})}else b.forEach(p=>{E.push({code:p.co,title:`${p.co} Remedial Pedagogy for ${t}`,action:p.kpiPct===0?`Outcome ${p.co} was not formally assessed or attained 0%. Integrate structured formative class tests and map distinct problem-solving rubrics in upcoming midterm and final examinations.`:`Student attainment (${p.kpiPct}%) lagged by ${p.gap}% behind the ${s}% KPI. Conduct two specialized tutorial clinics on core analytical topics and introduce step-by-step problem decomposition exercises.`,category:p.kpiPct===0?"Assessment Refinement":"Remedial Clinics"})}),v.forEach(p=>{E.push({code:p.po,title:`${p.po} (${p.desc}) Reinforcement Plan`,action:p.kpiPct===0?`${p.po} attained 0% in this offering. Restructure course assignment deliverables to incorporate ${p.desc.toLowerCase()} components with explicit rubric scoring.`:`Attainment reached ${p.kpiPct}% vs ${g}% benchmark. Introduce peer-evaluated collaborative assignments and require mini-design case studies demonstrating ${p.desc.toLowerCase()}.`,category:"Pedagogical Delivery"})});const I=a?`Continuous Quality Improvement (CQI) assessment for ${n} (${t}) conducted for ${o} ${e} across Section ${i}. The evaluation benchmarked Course Outcomes against a ${s}% KPI and Program Outcomes against ${g}%. All evaluated outcomes successfully met or exceeded established performance criteria, demonstrating solid conceptual comprehension. Proactive continuous enhancement strategies have been formulated to sustain achievement and elevate future performance benchmarks.`:`Continuous Quality Improvement (CQI) assessment for ${n} (${t}) conducted for ${o} ${e} across Section ${i}. The evaluation benchmarked Course Outcomes against a ${s}% KPI and Program Outcomes against ${g}%. Identified ${b.length} deficit CO(s) and ${v.length} deficit PO(s) requiring targeted pedagogical and rubric remediation to close the loop.`,R=a?[m?`Relative cognitive variation observed in ${m.co} (${m.kpiPct}%) due to multi-step analytical complexity compared to foundational modules.`:"Minor variance in analytical problem decomposition across complex problem sets compared to standard descriptive questions.","Sustained cognitive engagement achieved through structured continuous assessments, with scope for deeper hands-on tool practicals.","High overall comprehension across summative assessments, with opportunities to introduce honors-level complex engineering problem (WP1-WP4) challenges."]:[b.length>0?"Higher cognitive demand in terminal exam questions without sufficient formative scaffolding during regular lectures.":"Sustained cognitive engagement through continuous laboratory assignments.",v.length>0?"Lack of explicit grading criteria and student awareness regarding mapped Washington Accord professional competencies.":"Balanced question distribution mapped effectively across Bloom's Taxonomy levels.","Time constraints in completing advanced syllabus units before summative evaluation periods."],$=a?[`Integrate advanced complex engineering problem modules (WP1-WP4) into ${n} assignments during ${l}.`,"Introduce open-ended design challenges and industry case studies to elevate student mastery beyond baseline benchmarks.",`Refine assessment rubrics to reward higher-order synthesis and innovative analytical design in ${l}.`,"Maintain continuous formative feedback loops to sustain 100% attainment across all active outcomes."]:[`Incorporate explicit Bloom's Taxonomy aligned rubrics for all assessments in ${n} during ${l}.`,`Schedule mandatory remedial problem-solving tutorials before midterm and final examinations in ${l}.`,"Mandate hands-on software/tool laboratory components with progressive difficulty levels.","Review question difficulty index during Course Assessment Committee (CAC) pre-moderation."],w=a?`Target to sustain ≥ ${s}% attainment while elevating higher-order design competency to ≥ ${Math.min(s+5,85)}% in the subsequent offering of ${n} in ${l}.`:`Target minimum 70% student attainment across all evaluated outcomes in the subsequent offering of ${n} in ${l}.`,O=a?`3. Action Agreed: Course teacher will integrate advanced complex problem modules (WP1-WP4) and maintain high engagement rubrics.
4. Verification: Cohort performance will be evaluated at the conclusion of ${l} offering to sustain exemplary outcome attainment.`:`3. Action Agreed: Course teacher will revise formative question rubrics and conduct targeted tutorial drills.
4. Verification: Attainment will be re-audited at the conclusion of ${l} offering to ensure loop closure.`;return H({summary:I,rootCauses:R,remediations:E,actionPlanForNextSemester:$,closingTheLoopTarget:w,meetingMinutesDraft:`MINUTES OF COURSE CQI REVIEW MEETING - DEPARTMENT OF CSE
Course: ${n} (${t})
Semester: ${o} ${e} | Section: ${i}
Next Target Semester: ${l}

1. Review of Attainment: The committee reviewed direct attainment scores. Target KPI was set at ${s}%.
2. Attainment Status: ${a?"All evaluated outcomes met or exceeded the KPI benchmark.":`Outcomes requiring remediation: ${[...b.map(p=>p.co),...v.map(p=>p.po)].join(", ")||"None"}.`}
${O}`,aiSource:"heuristic",generatedAt:new Date().toISOString(),courseCode:n,courseTitle:t,semester:`${o} ${e}`,thresholds:{targetPassMarks:c,kpiCO:s,kpiPO:g},allAttained:a,section1Title:a?"1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS":"1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)",section1Sublabel:a?"IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:":"IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:"})}async function qe({batchId:n="Batch",section:t="ALL",threshold:o=50,batchChartData:e=[],clusterStats:i=[],completedCourses:c=[],forceRegenerate:s=!1,customMeetingNotes:g=""}){const f=`BAETE_BATCH_CQI_${n}_${t}_${o}_v2`;if(!s)try{const a=localStorage.getItem(f);if(a){const l=JSON.parse(a);if(l!=null&&l.poRemediations&&(l!=null&&l.facultyMeetingReport))return{...l,aiSource:l.aiSource||"cached"}}}catch(a){console.warn("[CQI-AI] Error reading batch CQI cache:",a)}const r=e.filter(a=>a.avgAttainment>0&&a.avgAttainment<o),h=e.filter(a=>a.avgAttainment===0),d=e.filter(a=>a.avgAttainment>=o),b=c.slice(0,15).map(a=>`${a.courseCode} (${a.courseTitle||""}, Cr:${a.creditHours||3}, AvgPO:${a.avgPO||0}%)`).join("; "),v=`System Role: You are the Chief Accreditation Consultant and Chair of the Continuous Quality Improvement (CQI) & OBE Committee at Department of Computer Science & Engineering, Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.
TASK: Generate an official BAETE Criterion 3 & Criterion 9 Continuous Quality Improvement (CQI) Action Plan and Departmental Faculty Review Meeting Report for:
- Batch / Cohort: ${n} (Section: ${t})
- Washington Accord Accreditation Standard: Benchmark Threshold = ${o}% Attainment
- Completed Courses in Analysis: ${c.length} courses (${b})

BATCH PO ATTAINMENT AUDIT:
1. Deficit POs (Attempted but below ${o}% threshold):
${r.length>0?r.map(a=>`- ${a.po} (${F[a.po]}): Mean Attainment = ${a.avgAttainment}%, Pass Rate = ${a.passRate}%, Gap = -${(o-a.avgAttainment).toFixed(1)}%`).join(`
`):"None"}

2. Unmapped / Zero Attainment POs (Completely missing or 0% in evaluated courses):
${h.length>0?h.map(a=>`- ${a.po} (${F[a.po]}): 0% Attainment (Curriculum Mapping Deficiency)`).join(`
`):"None"}

3. Attained POs (≥ ${o}%):
${d.map(a=>`- ${a.po} (${F[a.po]}): ${a.avgAttainment}% (Pass Rate: ${a.passRate}%)`).join(`
`)}

Washington Accord Competency Clusters:
${i.map(a=>`- ${a.short} Cluster: ${a.avgAttainment}% (${a.avgAttainment>=o?"Attained":"Deficit"})`).join(`
`)}

${g?`FACULTY MEETING DISCUSSION MINUTES / NOTES INPUT:
${g}
`:""}

CRITICAL BAETE GUIDELINES:
- For Deficit POs: Provide concise, high-impact pedagogical remediations (strictly 2 to 3 lines per PO) identifying how course instructors should adapt delivery, lab rubrics, and assessments.
- For Zero/Unmapped POs: Identify them as "Curriculum Gaps". State specifically which core/elective courses (e.g., Software Engineering Lab, Capstone Project I & II, Microprocessors, Numerical Analysis, Engineering Ethics) they MUST be allocated to in upcoming semesters to meet Washington Accord requirements.
- Produce an official, beautifully articulated "BAETE CQI Faculty Review & Action Report" containing:
  1. Executive Summary & Root Cause Analysis (RCA)
  2. Course-Level Action Directives
  3. Curriculum Realignment Roadmap for Unmapped POs
  4. Closing-the-Loop Implementation Timeline & Faculty Responsibilities

OUTPUT FORMAT: Return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "poRemediations": {
    ${e.map(a=>`"${a.po}": {
      "po": "${a.po}",
      "name": "${F[a.po]}",
      "isZero": ${a.avgAttainment===0},
      "avgAttainment": ${a.avgAttainment},
      "passRate": ${a.passRate},
      "gap": ${a.avgAttainment<o?(o-a.avgAttainment).toFixed(1):0},
      "remediation": "Concise 2-3 lines of pedagogical remediation or curriculum allocation roadmap...",
      "allocatedCourses": ["Suggested Course 1", "Suggested Course 2"]
    }`).join(`,
    `)}
  },
  "facultyMeetingReport": {
    "title": "BAETE Continuous Quality Improvement (CQI) Faculty Review & Action Report",
    "meetingMetadata": {
      "committee": "Departmental Academic Committee (DAC) & Course Assessment Committee (CAC)",
      "batch": "${n}",
      "section": "${t}",
      "threshold": "${o}%",
      "date": "${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}",
      "coursesEvaluatedCount": ${c.length}
    },
    "executiveSummary": "...",
    "rootCauseAnalysis": [
      { "cluster": "Technical Foundations", "finding": "...", "action": "..." },
      { "cluster": "Modern Engineering Practice", "finding": "...", "action": "..." },
      { "cluster": "Professional & Lifelong Skills", "finding": "...", "action": "..." }
    ],
    "curriculumRealignmentPlan": [
      { "po": "PO5", "status": "Curriculum Gap", "recommendation": "..." }
    ],
    "closingTheLoopTimeline": [
      { "phase": "Immediate (Next Semester)", "milestone": "...", "responsible": "Course Instructors & Lab Coordinators" },
      { "phase": "Mid-Term Audit", "milestone": "...", "responsible": "Departmental CQI Committee" },
      { "phase": "Terminal Loop Closure", "milestone": "...", "responsible": "Head of Department & OBE Committee" }
    ],
    "officialMinutesText": "..."
  }
}`;try{const l={...await ge(v),aiSource:"gemini",generatedAt:new Date().toISOString(),batchId:n,section:t,threshold:o};try{localStorage.setItem(f,JSON.stringify(l))}catch(A){console.warn("[CQI-AI] Failed saving batch CQI to localStorage:",A)}return l}catch(a){console.warn("[CQI-AI] Gemini batch call failed, generating academic heuristic fallback:",a.message);const l=Ke({batchId:n,section:t,threshold:o,batchChartData:e,clusterStats:i,completedCourses:c,deficitPOs:r,zeroPOs:h,attainedPOs:d});try{localStorage.setItem(f,JSON.stringify(l))}catch{}return l}}function Ke({batchId:n,section:t,threshold:o,batchChartData:e,clusterStats:i,completedCourses:c,deficitPOs:s,zeroPOs:g,attainedPOs:f}){const r={},h={PO1:["Data Structures & Algorithms","Discrete Mathematics","Electrical Circuits"],PO2:["Design & Analysis of Algorithms","Theory of Computation","Database Management Systems"],PO3:["Software Engineering","System Analysis & Design","Capstone Design Project I & II"],PO4:["Operating Systems Lab","Computer Networks Lab","Advanced Research Practicum"],PO5:["Software Development Lab (IDEs, Git)","VLSI Simulation Lab (ModelSim)","Mobile App Studio"],PO6:["Cyber Law & Professional Ethics","Artificial Intelligence & Society","Engineering Economics"],PO7:["Green Computing","Environmental Studies","Renewable Energy Systems"],PO8:["Engineering Ethics","Research Methodology & Publication Ethics","Industrial Attachment"],PO9:["Object-Oriented Programming Project","Capstone Project Phase I","Competitive Hackathons"],PO10:["Technical Report Writing & Presentation","Senior Design Colloquium","Oral Defense"],PO11:["Engineering Project Management","Software Project Management","Entrepreneurship Practicum"],PO12:["Independent Study & Literature Review","Emerging Technology Seminars","MOOC Certifications"]};return e.forEach(d=>{var m;const b=d.avgAttainment===0,v=d.avgAttainment<o,a=Math.round((o-d.avgAttainment)*10)/10,l=F[d.po]||d.po;let A="";b?A=`Curriculum Gap: ${d.po} (${l}) has 0% attainment in the selected course basket. Immediately allocate this outcome to core engineering labs (${(m=h[d.po])==null?void 0:m.slice(0,2).join(", ")}) with explicit assessment rubrics to fulfill Washington Accord graduation requirements.`:v?A=`Performance deficit detected with ${d.avgAttainment}% average (-${a}% gap below ${o}% threshold). Course instructors must revise formative assessment rubrics, mandate hands-on case studies, and organize guided problem-solving clinics in mapped courses.`:A=`Target benchmark achieved (${d.avgAttainment}%). Maintain continuous quality improvement through complex engineering problem (WP1-WP7) integration in advanced electives.`,r[d.po]={po:d.po,name:l,isZero:b,avgAttainment:d.avgAttainment,passRate:d.passRate,gap:v?a:0,remediation:A,allocatedCourses:h[d.po]||[]}}),H({poRemediations:r,facultyMeetingReport:{title:"BAETE Continuous Quality Improvement (CQI) Faculty Review & Action Report",meetingMetadata:{committee:"Departmental Academic Committee (DAC) & Course Assessment Committee (CAC)",batch:String(n),section:String(t),threshold:`${o}%`,date:new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),coursesEvaluatedCount:c.length},executiveSummary:`The Departmental CQI review convened to evaluate cumulative Washington Accord Program Outcome attainments for Batch ${n} (Section: ${t}) across ${c.length} completed courses against a ${o}% criterion threshold. Out of 12 outcomes, ${f.length} achieved the benchmark while ${s.length+g.length} outcome(s) require proactive pedagogical and curricular intervention to ensure compliance with BAETE Criterion 3 & 9.`,rootCauseAnalysis:[{cluster:"Technical Foundations (PO1–PO4)",finding:"Students demonstrate adequate theoretical recall but show shortfall in open-ended investigation and synthesis.",action:"Introduce project-based learning with iterative rubric evaluation in 3rd and 4th year core courses."},{cluster:"Modern Engineering Practice (PO5–PO8)",finding:g.some(d=>["PO5","PO6","PO7","PO8"].includes(d.po))?"Curriculum gaps identified where modern tool and ethics components were omitted from direct course assessments.":"Moderate attainment; requires stronger integration of industry simulation tools.",action:"Formally map PO5 and PO8 into laboratory rubrics and capstone evaluation matrices."},{cluster:"Professional Skills (PO9–PO12)",finding:"Soft skills and project finance show variance across sections due to subjective evaluation.",action:"Standardize multi-criteria peer evaluation forms and mandate project management Gantt charts."}],curriculumRealignmentPlan:g.map(d=>({po:d.po,name:F[d.po],status:"Curriculum Deficiency",recommendation:`Allocate to upcoming curriculum modules: ${(h[d.po]||[]).join(", ")}.`})),closingTheLoopTimeline:[{phase:"Phase 1: Course File & Rubric Alignment (Weeks 1–4)",milestone:"Instructors update course outlines with explicit CO-PO mapping and tool rubrics.",responsible:"Course Instructors & Module Coordinators"},{phase:"Phase 2: Mid-Semester Formative Audit (Week 8)",milestone:"Evaluate student quiz/lab performance; organize tutorial support for at-risk cohorts.",responsible:"Course Assessment Committee (CAC)"},{phase:"Phase 3: Final Loop Closure Audit (Week 16)",milestone:"Re-compute direct PO attainment and verify closure of identified deficit gaps.",responsible:"Head of Department & Central OBE Cell"}],officialMinutesText:`DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST)

MINUTES OF BAETE CONTINUOUS QUALITY IMPROVEMENT (CQI) REVIEW MEETING
Batch: ${n} | Section: ${t} | Date: ${new Date().toLocaleDateString()}

1. AGENDA: Evaluation of 12 Program Outcomes (PO1–PO12) direct attainment against BAETE ${o}% benchmark.
2. ATTAINMENT REVIEW: Evaluated across ${c.length} completed courses. Total Attained: ${f.length} / 12 POs. Deficit POs: ${[...s.map(d=>d.po),...g.map(d=>`${d.po} (0%)`)].join(", ")||"None"}.
3. ROOT CAUSE ANALYSIS: Deficits in technical tools and investigation stem from late curriculum mapping and unaligned terminal examination questions.
4. ACTION PLAN & DIRECTIVES: Course coordinators are mandated to incorporate explicit rubrics for deficit outcomes. Zero-attainment POs must be mapped to upcoming laboratory and capstone offerings.
5. CLOSING THE LOOP: The Departmental CQI Committee will conduct a mid-term verification to assess remediation effectiveness.`},aiSource:"heuristic",generatedAt:new Date().toISOString(),batchId:n,section:t,threshold:o})}function P(n){return typeof n!="string"?n:n.replace(/\bRevise course syllabi\b/gi,"Revise course syllabus").replace(/\bcourse syllabi\b/gi,"course syllabus").replace(/\bunseen course syllabi\b/gi,"unseen course syllabuses").replace(/\bsyllabi\b/gi,"course syllabus").replace(/\bthe the\b/gi,"the").replace(/\ba a\b/gi,"a").replace(/\bbench-marked\b/gi,"benchmarked").replace(/\bBloom levels\b/gi,"Bloom's Taxonomy levels").replace(/\bBlooms Taxonomy\b/gi,"Bloom's Taxonomy")}function fe(n,t){const o=new Blob(["\uFEFF"+n],{type:"application/msword;charset=utf-8"}),e=URL.createObjectURL(o),i=document.createElement("a");i.href=e,i.download=t.endsWith(".doc")?t:`${t}.doc`,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(e)}function et({courseCode:n="Course",courseTitle:t="Course Title",semesterName:o="Semester",academicYear:e="2026",sectionName:i="A",nextTerm:c="Subsequent Semester",targetPassMarks:s=40,kpiCO:g=50,kpiPO:f=50,cqiData:r=null,customNotes:h="",allAttained:d=void 0}){const b=n.replace(/[^a-zA-Z0-9_-]/g,"_"),v=`${o}_${e}`.replace(/[^a-zA-Z0-9_-]/g,"_"),a=`${b}_CQI_Action_Plan_${v}.doc`,l=d!==void 0?!!d:(r==null?void 0:r.allAttained)!==void 0?!!r.allAttained:!1,A=l?"1. EXECUTIVE EVALUATION & CONTINUOUS ENHANCEMENT ANALYSIS":"1. EXECUTIVE EVALUATION & ROOT CAUSE ANALYSIS (RCA)",m=l?"IDENTIFIED COMPREHENSION BOTTLENECKS / ENHANCEMENT AREAS:":"IDENTIFIED CONTRIBUTING FACTORS / ROOT CAUSES:",E=P((r==null?void 0:r.summary)||"Outcome-based assessment audit completed against BAETE benchmarks."),I=((r==null?void 0:r.rootCauses)||[]).map(P),R=((r==null?void 0:r.remediations)||[]).map(S=>({code:S.code,title:P(S.title),action:P(S.action)})),$=((r==null?void 0:r.actionPlanForNextSemester)||[]).map(P),w=P((r==null?void 0:r.closingTheLoopTarget)||`Achieve target threshold in ${c}.`),O=P(h||(r==null?void 0:r.meetingMinutesDraft)||"Pedagogical deliberations completed and approved by Course Assessment Committee."),p=`
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Course CQI Action Plan - ${n}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 0.4in 0.5in 0.4in 0.5in;
          mso-header-margin: 0.2in;
          mso-footer-margin: 0.2in;
          mso-footer: f1;
        }
        div.Section1 {
          page: Section1;
        }
        table#hrdftrtbl {
          margin: 0in 0in 0in 900in;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        body {
          font-family: 'Segoe UI', Arial, 'Times New Roman', sans-serif;
          font-size: 8.5pt;
          color: #111827;
          line-height: 1.35;
          padding: 0;
          margin: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .banner {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          text-align: center;
          font-size: 11pt;
          letter-spacing: 0.4pt;
          text-transform: uppercase;
          padding: 3pt 0;
          margin-top: 4pt;
          margin-bottom: 2pt;
        }
        .sec-h4 {
          font-size: 9pt;
          font-weight: bold;
          color: #0f172a;
          text-transform: uppercase;
          border-bottom: 1.5pt solid #15803d;
          padding-bottom: 2pt;
          margin-top: 8pt;
          margin-bottom: 4pt;
        }
        .meta-table {
          width: 100%;
          border: 1pt solid #334155;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .meta-table td {
          border: 1pt solid #334155;
          padding: 3pt 5pt;
          vertical-align: middle;
        }
        .meta-table td.lbl {
          font-weight: bold;
          background-color: #f1f5f9;
          color: #1e293b;
          width: 22%;
        }
        .meta-table td.val {
          color: #0f172a;
          width: 28%;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .report-table th {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          padding: 3.5pt 5pt;
          border: 1pt solid #14532d;
          text-align: left;
          font-size: 8pt;
        }
        .report-table td {
          border: 1pt solid #cbd5e1;
          padding: 3pt 5pt;
          vertical-align: top;
          line-height: 1.3;
        }
        .notes-box {
          background-color: #f8fafc;
          border: 1pt solid #cbd5e1;
          padding: 5pt 7pt;
          font-family: 'Courier New', Courier, monospace;
          font-size: 7.5pt;
          line-height: 1.3;
          margin-bottom: 6pt;
          color: #1e293b;
        }
        .sig-table {
          width: 100%;
          margin-top: 18pt;
          border: none;
          page-break-inside: avoid;
        }
        .sig-table td {
          border: none;
          width: 50%;
          text-align: center;
          vertical-align: bottom;
          padding: 0 10pt;
        }
        .sig-bar {
          width: 160pt;
          border-bottom: 1.2pt solid #0f172a;
          margin: 0 auto 3pt auto;
        }
        p.MsoFooter {
          margin: 0;
          font-size: 7.5pt;
          color: #64748b;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Official Institutional Header -->
        <table style="width:100%; border:none; margin-bottom:4pt;">
          <tr>
            <td style="border:none; text-align:center;">
              ${`<img src="${de}" width="50" height="50" style="width:40pt; height:40pt; margin:0 auto 2pt auto;" alt="BAIUST Logo" /><br>`}
              <div style="font-family:'Kalpurush','Nirmala UI','Vrinda',sans-serif; font-size:12pt; font-weight:bold; color:#0f172a;">
                বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
              </div>
              <div style="font-size:10pt; font-weight:bold; color:#0f172a; text-transform:uppercase; letter-spacing:0.4pt;">
                Bangladesh Army International University of Science &amp; Technology (BAIUST), Cumilla
              </div>
              <div style="font-size:8.5pt; font-weight:bold; color:#374151; margin-top:1pt;">
                Department of Computer Science and Engineering
              </div>
            </td>
          </tr>
        </table>

        <!-- Title Banner -->
        <div class="banner">Course Continuous Quality Improvement (CQI) Action Plan</div>
        <div style="text-align:center; font-size:7.5pt; font-weight:bold; color:#15803d; margin-bottom:6pt;">
          BAETE Accreditation Criteria 3 &amp; 9 — Outcome Closing-the-Loop Protocol
        </div>

        <!-- Metadata Table -->
        <table class="meta-table">
          <tr>
            <td class="lbl">Course Code</td>
            <td class="val">: <strong>${n}</strong></td>
            <td class="lbl">Course Title</td>
            <td class="val">: <strong>${t}</strong></td>
          </tr>
          <tr>
            <td class="lbl">Semester &amp; Year</td>
            <td class="val">: ${o} ${e}</td>
            <td class="lbl">Section / Cohort</td>
            <td class="val">: Section ${i}</td>
          </tr>
          <tr>
            <td class="lbl">Subsequent Target</td>
            <td class="val">: <strong style="color:#15803d;">${c} (Loop Closure)</strong></td>
            <td class="lbl">Evaluation Date</td>
            <td class="val">: ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</td>
          </tr>
        </table>

        <!-- Benchmarks Banner -->
        <table style="width:100%; border:1pt solid #86efac; background-color:#f0fdf4; margin-bottom:6pt;">
          <tr>
            <td style="border:none; padding:3pt 6pt; font-size:8pt; color:#14532d;">
              <strong>Assessment Benchmarks:</strong> Pass Mark &ge; <strong>${s}%</strong> &nbsp;|&nbsp;
              Course Outcome KPI &ge; <strong>${g}%</strong> &nbsp;|&nbsp;
              Program Outcome KPI &ge; <strong>${f}%</strong>
            </td>
          </tr>
        </table>

        <!-- Section 1: Executive Summary & RCA / Continuous Enhancement -->
        <div class="sec-h4">${A}</div>
        <p style="font-size:8pt; line-height:1.35; margin-bottom:4pt; text-align:justify;">${E}</p>
        ${I.length>0?`<div style="font-size:7.5pt; font-weight:bold; color:#14532d; text-transform:uppercase; margin:4pt 0 2pt 0; letter-spacing:0.3pt;">${m}</div>
               <ul style="margin:2pt 0 4pt 16pt; font-size:8pt; line-height:1.35; color:#374151;">
                ${I.map(S=>`<li style="margin-bottom:2pt;">${S}</li>`).join("")}
              </ul>`:""}

        <!-- Section 2: Targeted Pedagogical Remediations -->
        <div class="sec-h4">2. Targeted Pedagogical Remediations &amp; Interventions (BAETE Criterion 9)</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:12%; text-align:center;">Outcome</th>
              <th style="width:28%;">Remedial Module / Focus</th>
              <th style="width:60%;">Pedagogical Remediation &amp; Corrective Action</th>
            </tr>
          </thead>
          <tbody>
            ${R.map(S=>`<tr>
                  <td style="text-align:center; font-weight:bold;">${S.code}</td>
                  <td style="font-weight:bold;">${S.title}</td>
                  <td>${S.action}</td>
                </tr>`).join("")}
          </tbody>
        </table>

        <!-- Section 3: Action Directives for Next Offering -->
        <div class="sec-h4">3. Action Directives for Next Offering (${c})</div>
        <ol style="margin:2pt 0 4pt 16pt; font-size:8pt; line-height:1.35; color:#1f2937;">
          ${$.map(S=>`<li style="margin-bottom:2pt;">${S}</li>`).join("")}
        </ol>

        <!-- Section 4: Closing-the-Loop Target -->
        <div class="sec-h4">4. Closing-the-Loop Target &amp; Verification</div>
        <table style="width:100%; border:1pt solid #cbd5e1; background-color:#f8fafc; margin-bottom:6pt;">
          <tr>
            <td style="border:none; padding:4pt 6pt; font-size:8pt; color:#0f172a;">
              <strong>Target Milestone:</strong> ${w}
            </td>
          </tr>
        </table>

        <!-- Section 5: CAC Review Minutes -->
        <div class="sec-h4">5. Course Assessment Committee (CAC) Review &amp; Pedagogical Discussion Minutes</div>
        <div class="notes-box">${O}</div>

        <!-- Dual Signature Section -->
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Course Instructor</div>
              <div style="font-size:7pt; color:#64748b;">Department of Computer Science &amp; Engineering</div>
            </td>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Head of Department / Convener</div>
              <div style="font-size:7pt; color:#64748b;">Course Assessment Committee (CAC) &amp; OBE Cell</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Word Running Footer -->
      <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="mso-element:footer" id="f1">
              <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cbd5e1; padding-top:2pt;">
                <tr>
                  <td style="border:none; text-align:left;">
                    <p class="MsoFooter">
                      Course CQI Closing-the-Loop Protocol &bull; Department of CSE, BAIUST &bull; ${n} (${i})
                    </p>
                  </td>
                  <td style="border:none; text-align:right;">
                    <p class="MsoFooter">
                      Page <!--[if supportFields]><span style='mso-element:field-begin'></span>PAGE <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> of <!--[if supportFields]><span style='mso-element:field-begin'></span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;fe(p,a)}function tt({batchId:n="Batch",section:t="ALL",threshold:o=50,completedCoursesCount:e=0,cqiReport:i=null,meetingNotes:c=""}){const s=typeof n=="object"&&n!==null?n.name||n.batchNum||n.id||"Current Batch":String(n||"Current Batch"),f=`Batch_${String(s).replace(/[^a-zA-Z0-9_-]/g,"_")}_Sec_${t}_BAETE_CQI_Faculty_Report.doc`,r=(i==null?void 0:i.facultyMeetingReport)||i||{},h=(r==null?void 0:r.meetingMetadata)||(r==null?void 0:r.meta)||(i==null?void 0:i.meta)||{},d=P(r.executiveSummary||`Comprehensive longitudinal review of direct program outcome attainment against BAETE standards for Batch ${s} (${t==="ALL"?"All Sections":`Section ${t}`}). Evaluated across ${e} completed courses.`),b=r.rootCauseAnalysis&&r.rootCauseAnalysis.length>0?r.rootCauseAnalysis.map(m=>({cluster:P(m.cluster),finding:P(m.finding),action:P(m.action)})):[{cluster:"Technical Foundations (PO1–PO4)",finding:"Strong theoretical comprehension and algorithmic problem-solving across core courses.",action:"Maintain rigorous assessment standards while introducing complex engineering design problems."},{cluster:"Modern Engineering Practice (PO5–PO8)",finding:"Deficit observed in modern tool utilization and professional ethics assessment instruments.",action:"Mandate modern software/hardware tool rubrics in lab courses and integrate engineering ethics case studies."},{cluster:"Professional & Lifelong Skills (PO9–PO12)",finding:"Variance in professional communication and teamwork deliverables across sections.",action:"Incorporate multi-disciplinary team projects and formal technical report rubrics to close the attainment gap."}],v=(r.curriculumRealignmentPlan||[]).map(m=>({po:m.po,name:m.name||"",status:m.status||"Curriculum Deficiency",recommendation:P(m.recommendation)})),a=r.closingTheLoopTimeline&&r.closingTheLoopTimeline.length>0?r.closingTheLoopTimeline.map(m=>({phase:P(m.phase),milestone:P(m.milestone),responsible:P(m.responsible)})):[{phase:"Immediate (Next Semester)",milestone:"Revise course syllabus, lab manuals, and assessment rubrics to integrate missing PO mappings.",responsible:"Course Instructors & Lab Coordinators"},{phase:"Mid-Term Audit",milestone:"Conduct departmental spot-checks on mid-term assessment papers to verify active measurement of deficit POs.",responsible:"Departmental CQI Committee"},{phase:"Terminal Loop Closure",milestone:`Compile post-semester attainment data for Batch ${s}, verify closure of gaps against the ${o}% benchmark, and submit final compliance report to IQAC and BAETE.`,responsible:"Head of Department & OBE Committee"}],l=P(c||r.officialMinutesText||"Meeting deliberations completed and recorded by the faculty review committee."),A=`
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>BAETE CQI Faculty Review - Batch ${s}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: 595.3pt 841.9pt; /* A4 */
          margin: 0.4in 0.5in 0.4in 0.5in;
          mso-header-margin: 0.2in;
          mso-footer-margin: 0.2in;
          mso-footer: f1;
        }
        div.Section1 {
          page: Section1;
        }
        table#hrdftrtbl {
          margin: 0in 0in 0in 900in;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        body {
          font-family: 'Segoe UI', Arial, 'Times New Roman', sans-serif;
          font-size: 8.5pt;
          color: #111827;
          line-height: 1.35;
          padding: 0;
          margin: 0;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        .banner {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          text-align: center;
          font-size: 11pt;
          letter-spacing: 0.4pt;
          text-transform: uppercase;
          padding: 3pt 0;
          margin-top: 4pt;
          margin-bottom: 2pt;
        }
        .sec-h4 {
          font-size: 9pt;
          font-weight: bold;
          color: #0f172a;
          text-transform: uppercase;
          border-bottom: 1.5pt solid #15803d;
          padding-bottom: 2pt;
          margin-top: 8pt;
          margin-bottom: 4pt;
        }
        .meta-table {
          width: 100%;
          border: 1pt solid #334155;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .meta-table td {
          border: 1pt solid #334155;
          padding: 3pt 5pt;
          vertical-align: middle;
        }
        .meta-table td.lbl {
          font-weight: bold;
          background-color: #f1f5f9;
          color: #1e293b;
          width: 22%;
        }
        .meta-table td.val {
          color: #0f172a;
          width: 28%;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6pt;
          font-size: 8pt;
        }
        .report-table th {
          background-color: #15803d;
          color: #ffffff;
          font-weight: bold;
          padding: 3.5pt 5pt;
          border: 1pt solid #14532d;
          text-align: left;
          font-size: 8pt;
        }
        .report-table td {
          border: 1pt solid #cbd5e1;
          padding: 3pt 5pt;
          vertical-align: top;
          line-height: 1.3;
        }
        .notes-box {
          background-color: #f8fafc;
          border: 1pt solid #cbd5e1;
          padding: 5pt 7pt;
          font-family: 'Courier New', Courier, monospace;
          font-size: 7.5pt;
          line-height: 1.3;
          margin-bottom: 6pt;
          color: #1e293b;
        }
        .sig-table {
          width: 100%;
          margin-top: 18pt;
          border: none;
          page-break-inside: avoid;
        }
        .sig-table td {
          border: none;
          width: 50%;
          text-align: center;
          vertical-align: bottom;
          padding: 0 10pt;
        }
        .sig-bar {
          width: 160pt;
          border-bottom: 1.2pt solid #0f172a;
          margin: 0 auto 3pt auto;
        }
        p.MsoFooter {
          margin: 0;
          font-size: 7.5pt;
          color: #64748b;
          font-family: 'Segoe UI', Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- Official Institutional Header -->
        <table style="width:100%; border:none; margin-bottom:4pt;">
          <tr>
            <td style="border:none; text-align:center;">
              ${`<img src="${de}" width="50" height="50" style="width:40pt; height:40pt; margin:0 auto 2pt auto;" alt="BAIUST Logo" /><br>`}
              <div style="font-family:'Kalpurush','Nirmala UI','Vrinda',sans-serif; font-size:12pt; font-weight:bold; color:#0f172a;">
                বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি (বাইউস্ট), কুমিল্লা
              </div>
              <div style="font-size:10pt; font-weight:bold; color:#0f172a; text-transform:uppercase; letter-spacing:0.4pt;">
                Bangladesh Army International University of Science &amp; Technology (BAIUST), Cumilla
              </div>
              <div style="font-size:8.5pt; font-weight:bold; color:#374151; margin-top:1pt;">
                Department of Computer Science and Engineering
              </div>
            </td>
          </tr>
        </table>

        <!-- Title Banner -->
        <div class="banner">BAETE Continuous Quality Improvement (CQI) Faculty Review &amp; Action Report</div>
        <div style="text-align:center; font-size:7.5pt; font-weight:bold; color:#15803d; margin-bottom:6pt;">
          BAETE Criteria 3 &amp; 9 — Washington Accord Program Outcomes Closing-the-Loop Protocol
        </div>

        <!-- Metadata Table -->
        <table class="meta-table">
          <tr>
            <td class="lbl">Committee</td>
            <td class="val">: <strong>${h.committee||"DAC / CAC"}</strong></td>
            <td class="lbl">Batch / Section</td>
            <td class="val">: <strong>Batch ${s} (${t==="ALL"?"All Sections":`Sec ${t}`})</strong></td>
          </tr>
          <tr>
            <td class="lbl">Threshold Benchmark</td>
            <td class="val">: <strong style="color:#15803d;">${o}% Target</strong></td>
            <td class="lbl">Courses Evaluated</td>
            <td class="val">: ${e} Courses Basket</td>
          </tr>
          <tr>
            <td class="lbl">Review Date</td>
            <td class="val" colspan="3">: ${h.date||new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</td>
          </tr>
        </table>

        <!-- Section 1: Executive Summary -->
        <div class="sec-h4">1. Executive Summary &amp; Attainment Synthesis</div>
        <p style="font-size:8pt; line-height:1.35; margin-bottom:4pt; text-align:justify;">${d}</p>

        <!-- Section 2: RCA by WA Clusters -->
        <div class="sec-h4">2. Root Cause Analysis (RCA) by Washington Accord Clusters</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:25%;">WA Cluster</th>
              <th style="width:35%;">Identified Gaps / Findings</th>
              <th style="width:40%;">Remedial Pedagogical Action</th>
            </tr>
          </thead>
          <tbody>
            ${b.map(m=>`<tr>
                  <td><strong>${m.cluster}</strong></td>
                  <td>${m.finding}</td>
                  <td>${m.action}</td>
                </tr>`).join("")}
          </tbody>
        </table>

        <!-- Section 3: Curriculum Realignment Roadmap (if unmapped POs) -->
        ${v.length>0?`<div class="sec-h4">3. Curriculum Realignment Roadmap (Unmapped POs / 0% Attainment - Criterion 4)</div>
               <table class="report-table">
                 <thead>
                   <tr>
                     <th style="width:12%; text-align:center;">PO Code</th>
                     <th style="width:28%;">Competency / Status</th>
                     <th style="width:60%;">Curriculum Mapping Directives &amp; Core Course Allocations</th>
                   </tr>
                 </thead>
                 <tbody>
                   ${v.map(m=>`<tr>
                         <td style="text-align:center;"><strong>${m.po}</strong></td>
                         <td style="color:#b91c1c; font-weight:bold;">${m.name?`${m.name} (${m.status})`:m.status}</td>
                         <td>${m.recommendation}</td>
                       </tr>`).join("")}
                 </tbody>
               </table>`:""}

        <!-- Section 4: Timeline & Responsibilities -->
        <div class="sec-h4">4. Closing-the-Loop Implementation Timeline &amp; Responsibilities</div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width:28%;">Implementation Phase</th>
              <th style="width:45%;">Target Milestone / Deliverable</th>
              <th style="width:27%;">Responsible Body</th>
            </tr>
          </thead>
          <tbody>
            ${a.map(m=>`<tr>
                  <td><strong>${m.phase}</strong></td>
                  <td>${m.milestone}</td>
                  <td style="color:#15803d; font-weight:bold;">${m.responsible}</td>
                </tr>`).join("")}
          </tbody>
        </table>

        <!-- Section 5: Faculty Minutes & Discussion Notes -->
        <div class="sec-h4">5. Departmental Meeting Minutes &amp; Faculty Discussion Notes</div>
        <div class="notes-box">${l}</div>

        <!-- Dual Signature Section -->
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Convener / Member Secretary</div>
              <div style="font-size:7pt; color:#64748b;">Course Assessment Committee (CAC)</div>
            </td>
            <td>
              <div class="sig-bar"></div>
              <div style="font-size:8pt; font-weight:bold; color:#0f172a;">Head of Department</div>
              <div style="font-size:7pt; color:#64748b;">Departmental Academic Committee (DAC) &amp; Central OBE Cell</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Word Running Footer -->
      <table id="hrdftrtbl" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <div style="mso-element:footer" id="f1">
              <table border="0" cellspacing="0" cellpadding="0" style="width:100%; border:none; border-top:0.5pt solid #cbd5e1; padding-top:2pt;">
                <tr>
                  <td style="border:none; text-align:left;">
                    <p class="MsoFooter">
                      BAETE Criteria 3 &amp; 9 Protocol &bull; Department of CSE, BAIUST &bull; Batch ${s} (${t})
                    </p>
                  </td>
                  <td style="border:none; text-align:right;">
                    <p class="MsoFooter">
                      Page <!--[if supportFields]><span style='mso-element:field-begin'></span>PAGE <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]--> of <!--[if supportFields]><span style='mso-element:field-begin'></span>NUMPAGES <span style='mso-element:field-separator'></span><![endif]-->1<!--[if supportFields]><span style='mso-element:field-end'></span><![endif]-->
                    </p>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;fe(A,f)}export{Ye as L,Je as P,Ze as T,Xe as a,D as b,tt as c,qe as d,et as e,pe as g};
