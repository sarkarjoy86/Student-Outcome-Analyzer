import{c as Or,j as e,i as Cr,y as hr,R as Tr,P as rr,T as ar,l as sr,Y as Er,Z as Rr,B as Fr,U as Mt,E as Lt,_ as Bt,n as Dr,a as nr}from"./index-9Hm5MAHx.js";import{R as W,r as K}from"./vendor-syncfusion-DyaZc6kb.js";import{P as _r,B as ir}from"./baiustLogo-DElYcZaK.js";import{R as Mr,S as Lr}from"./sparkles-OJrcNmda.js";import{D as Ue,d as xt,L as Br,a as zr}from"./chartDownload-BiJAttX-.js";import{u as wt,w as Kr}from"./vendor-xlsx-DrgRuPKf.js";import{h as Wr}from"./vendor-html2canvas-BfYXEYrK.js";import{i as rt,c as kt,C as Tt,T as Gr,f as He,p as Kt,a as st,L as Ie,g as at,b as Ur,S as Hr,A as gr,d as Ir,e as tt,h as Wt,j as Le,k as Yr,l as br,u as ur,G as fr,m as Et,n as Vr,o as At,q as Jr,r as St,w as or,s as Pt,t as qr,v as Qr,x as lr,D as Xr,y as yr,P as Zr,z as ea,B as ta,X as $e,Y as Se,E as ra,R as Oe,F as _e,H as Me,I as Fe,J as Ae,K as pt,M as Ot}from"./BarChart-CAJyHJzo.js";import{T as zt}from"./trending-up-Dc1zv0yu.js";import"./vendor-pdfjs-v1yRGPGI.js";import"./vendor-mammoth-ZDJ4FL1a.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aa=Or("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);var Rt;function gt(a){"@babel/helpers - typeof";return gt=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},gt(a)}function ht(){return ht=Object.assign?Object.assign.bind():function(a){for(var n=1;n<arguments.length;n++){var o=arguments[n];for(var i in o)Object.prototype.hasOwnProperty.call(o,i)&&(a[i]=o[i])}return a},ht.apply(this,arguments)}function dr(a,n){var o=Object.keys(a);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(a);n&&(i=i.filter(function(r){return Object.getOwnPropertyDescriptor(a,r).enumerable})),o.push.apply(o,i)}return o}function oe(a){for(var n=1;n<arguments.length;n++){var o=arguments[n]!=null?arguments[n]:{};n%2?dr(Object(o),!0).forEach(function(i){Be(a,i,o[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(o)):dr(Object(o)).forEach(function(i){Object.defineProperty(a,i,Object.getOwnPropertyDescriptor(o,i))})}return a}function sa(a,n){if(!(a instanceof n))throw new TypeError("Cannot call a class as a function")}function cr(a,n){for(var o=0;o<n.length;o++){var i=n[o];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(a,jr(i.key),i)}}function na(a,n,o){return n&&cr(a.prototype,n),o&&cr(a,o),Object.defineProperty(a,"prototype",{writable:!1}),a}function ia(a,n,o){return n=Ft(n),oa(a,vr()?Reflect.construct(n,o||[],Ft(a).constructor):n.apply(a,o))}function oa(a,n){if(n&&(gt(n)==="object"||typeof n=="function"))return n;if(n!==void 0)throw new TypeError("Derived constructors may only return object or undefined");return la(a)}function la(a){if(a===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return a}function vr(){try{var a=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return(vr=function(){return!!a})()}function Ft(a){return Ft=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(o){return o.__proto__||Object.getPrototypeOf(o)},Ft(a)}function da(a,n){if(typeof n!="function"&&n!==null)throw new TypeError("Super expression must either be null or a function");a.prototype=Object.create(n&&n.prototype,{constructor:{value:a,writable:!0,configurable:!0}}),Object.defineProperty(a,"prototype",{writable:!1}),n&&Gt(a,n)}function Gt(a,n){return Gt=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(i,r){return i.__proto__=r,i},Gt(a,n)}function Be(a,n,o){return n=jr(n),n in a?Object.defineProperty(a,n,{value:o,enumerable:!0,configurable:!0,writable:!0}):a[n]=o,a}function jr(a){var n=ca(a,"string");return gt(n)=="symbol"?n:n+""}function ca(a,n){if(gt(a)!="object"||!a)return a;var o=a[Symbol.toPrimitive];if(o!==void 0){var i=o.call(a,n);if(gt(i)!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(a)}var Ve=function(a){function n(o){var i;return sa(this,n),i=ia(this,n,[o]),Be(i,"pieRef",null),Be(i,"sectorRefs",[]),Be(i,"id",ur("recharts-pie-")),Be(i,"handleAnimationEnd",function(){var r=i.props.onAnimationEnd;i.setState({isAnimationFinished:!0}),rt(r)&&r()}),Be(i,"handleAnimationStart",function(){var r=i.props.onAnimationStart;i.setState({isAnimationFinished:!1}),rt(r)&&r()}),i.state={isAnimationFinished:!o.isAnimationActive,prevIsAnimationActive:o.isAnimationActive,prevAnimationId:o.animationId,sectorToFocus:0},i}return da(n,a),na(n,[{key:"isActiveIndex",value:function(i){var r=this.props.activeIndex;return Array.isArray(r)?r.indexOf(i)!==-1:i===r}},{key:"hasActiveIndex",value:function(){var i=this.props.activeIndex;return Array.isArray(i)?i.length!==0:i||i===0}},{key:"renderLabels",value:function(i){var r=this.props.isAnimationActive;if(r&&!this.state.isAnimationFinished)return null;var m=this.props,l=m.label,h=m.labelLine,y=m.dataKey,f=m.valueKey,R=He(this.props,!1),P=He(l,!1),M=He(h,!1),Z=l&&l.offsetRadius||20,v=i.map(function($,O){var re=($.startAngle+$.endAngle)/2,k=Kt($.cx,$.cy,$.outerRadius+Z,re),le=oe(oe(oe(oe({},R),$),{},{stroke:"none"},P),{},{index:O,textAnchor:n.getTextAnchor(k.x,$.cx)},k),G=oe(oe(oe(oe({},R),$),{},{fill:"none",stroke:$.fill},M),{},{index:O,points:[Kt($.cx,$.cy,$.outerRadius,re),k]}),L=y;return st(y)&&st(f)?L="value":st(y)&&(L=f),W.createElement(Ie,{key:"label-".concat($.startAngle,"-").concat($.endAngle,"-").concat($.midAngle,"-").concat(O)},h&&n.renderLabelLineItem(h,G,"line"),n.renderLabelItem(l,le,at($,L)))});return W.createElement(Ie,{className:"recharts-pie-labels"},v)}},{key:"renderSectorsStatically",value:function(i){var r=this,m=this.props,l=m.activeShape,h=m.blendStroke,y=m.inactiveShape;return i.map(function(f,R){if((f==null?void 0:f.startAngle)===0&&(f==null?void 0:f.endAngle)===0&&i.length!==1)return null;var P=r.isActiveIndex(R),M=y&&r.hasActiveIndex()?y:null,Z=P?l:M,v=oe(oe({},f),{},{stroke:h?f.fill:f.stroke,tabIndex:-1});return W.createElement(Ie,ht({ref:function(O){O&&!r.sectorRefs.includes(O)&&r.sectorRefs.push(O)},tabIndex:-1,className:"recharts-pie-sector"},Ur(r.props,f,R),{key:"sector-".concat(f==null?void 0:f.startAngle,"-").concat(f==null?void 0:f.endAngle,"-").concat(f.midAngle,"-").concat(R)}),W.createElement(Hr,ht({option:Z,isActive:P,shapeType:"sector"},v)))})}},{key:"renderSectorsWithAnimation",value:function(){var i=this,r=this.props,m=r.sectors,l=r.isAnimationActive,h=r.animationBegin,y=r.animationDuration,f=r.animationEasing,R=r.animationId,P=this.state,M=P.prevSectors,Z=P.prevIsAnimationActive;return W.createElement(gr,{begin:h,duration:y,isActive:l,easing:f,from:{t:0},to:{t:1},key:"pie-".concat(R,"-").concat(Z),onAnimationStart:this.handleAnimationStart,onAnimationEnd:this.handleAnimationEnd},function(v){var $=v.t,O=[],re=m&&m[0],k=re.startAngle;return m.forEach(function(le,G){var L=M&&M[G],z=G>0?Ir(le,"paddingAngle",0):0;if(L){var be=tt(L.endAngle-L.startAngle,le.endAngle-le.startAngle),U=oe(oe({},le),{},{startAngle:k+z,endAngle:k+be($)+z});O.push(U),k=U.endAngle}else{var ue=le.endAngle,X=le.startAngle,fe=tt(0,ue-X),se=fe($),ye=oe(oe({},le),{},{startAngle:k+z,endAngle:k+se+z});O.push(ye),k=ye.endAngle}}),W.createElement(Ie,null,i.renderSectorsStatically(O))})}},{key:"attachKeyboardHandlers",value:function(i){var r=this;i.onkeydown=function(m){if(!m.altKey)switch(m.key){case"ArrowLeft":{var l=++r.state.sectorToFocus%r.sectorRefs.length;r.sectorRefs[l].focus(),r.setState({sectorToFocus:l});break}case"ArrowRight":{var h=--r.state.sectorToFocus<0?r.sectorRefs.length-1:r.state.sectorToFocus%r.sectorRefs.length;r.sectorRefs[h].focus(),r.setState({sectorToFocus:h});break}case"Escape":{r.sectorRefs[r.state.sectorToFocus].blur(),r.setState({sectorToFocus:0});break}}}}},{key:"renderSectors",value:function(){var i=this.props,r=i.sectors,m=i.isAnimationActive,l=this.state.prevSectors;return m&&r&&r.length&&(!l||!Wt(l,r))?this.renderSectorsWithAnimation():this.renderSectorsStatically(r)}},{key:"componentDidMount",value:function(){this.pieRef&&this.attachKeyboardHandlers(this.pieRef)}},{key:"render",value:function(){var i=this,r=this.props,m=r.hide,l=r.sectors,h=r.className,y=r.label,f=r.cx,R=r.cy,P=r.innerRadius,M=r.outerRadius,Z=r.isAnimationActive,v=this.state.isAnimationFinished;if(m||!l||!l.length||!Le(f)||!Le(R)||!Le(P)||!Le(M))return null;var $=kt("recharts-pie",h);return W.createElement(Ie,{tabIndex:this.props.rootTabIndex,className:$,ref:function(re){i.pieRef=re}},this.renderSectors(),y&&this.renderLabels(l),Yr.renderCallByParent(this.props,null,!1),(!Z||v)&&br.renderCallByParent(this.props,l,!1))}}],[{key:"getDerivedStateFromProps",value:function(i,r){return r.prevIsAnimationActive!==i.isAnimationActive?{prevIsAnimationActive:i.isAnimationActive,prevAnimationId:i.animationId,curSectors:i.sectors,prevSectors:[],isAnimationFinished:!0}:i.isAnimationActive&&i.animationId!==r.prevAnimationId?{prevAnimationId:i.animationId,curSectors:i.sectors,prevSectors:r.curSectors,isAnimationFinished:!0}:i.sectors!==r.curSectors?{curSectors:i.sectors,isAnimationFinished:!0}:null}},{key:"getTextAnchor",value:function(i,r){return i>r?"start":i<r?"end":"middle"}},{key:"renderLabelLineItem",value:function(i,r,m){if(W.isValidElement(i))return W.cloneElement(i,r);if(rt(i))return i(r);var l=kt("recharts-pie-label-line",typeof i!="boolean"?i.className:"");return W.createElement(Tt,ht({},r,{key:m,type:"linear",className:l}))}},{key:"renderLabelItem",value:function(i,r,m){if(W.isValidElement(i))return W.cloneElement(i,r);var l=m;if(rt(i)&&(l=i(r),W.isValidElement(l)))return l;var h=kt("recharts-pie-label-text",typeof i!="boolean"&&!rt(i)?i.className:"");return W.createElement(Gr,ht({},r,{alignmentBaseline:"middle",className:h}),l)}}])}(K.PureComponent);Rt=Ve;Be(Ve,"displayName","Pie");Be(Ve,"defaultProps",{stroke:"#fff",fill:"#808080",legendType:"rect",cx:"50%",cy:"50%",startAngle:0,endAngle:360,innerRadius:0,outerRadius:"80%",paddingAngle:0,labelLine:!0,hide:!1,minAngle:0,isAnimationActive:!fr.isSsr,animationBegin:400,animationDuration:1500,animationEasing:"ease",nameKey:"name",blendStroke:!1,rootTabIndex:0});Be(Ve,"parseDeltaAngle",function(a,n){var o=Et(n-a),i=Math.min(Math.abs(n-a),360);return o*i});Be(Ve,"getRealPieData",function(a){var n=a.data,o=a.children,i=He(a,!1),r=Vr(o,At);return n&&n.length?n.map(function(m,l){return oe(oe(oe({payload:m},i),m),r&&r[l]&&r[l].props)}):r&&r.length?r.map(function(m){return oe(oe({},i),m.props)}):[]});Be(Ve,"parseCoordinateOfPie",function(a,n){var o=n.top,i=n.left,r=n.width,m=n.height,l=Jr(r,m),h=i+St(a.cx,r,r/2),y=o+St(a.cy,m,m/2),f=St(a.innerRadius,l,0),R=St(a.outerRadius,l,l*.8),P=a.maxRadius||Math.sqrt(r*r+m*m)/2;return{cx:h,cy:y,innerRadius:f,outerRadius:R,maxRadius:P}});Be(Ve,"getComposedData",function(a){var n=a.item,o=a.offset,i=n.type.defaultProps!==void 0?oe(oe({},n.type.defaultProps),n.props):n.props,r=Rt.getRealPieData(i);if(!r||!r.length)return null;var m=i.cornerRadius,l=i.startAngle,h=i.endAngle,y=i.paddingAngle,f=i.dataKey,R=i.nameKey,P=i.valueKey,M=i.tooltipType,Z=Math.abs(i.minAngle),v=Rt.parseCoordinateOfPie(i,o),$=Rt.parseDeltaAngle(l,h),O=Math.abs($),re=f;st(f)&&st(P)?(or(!1,`Use "dataKey" to specify the value of pie,
      the props "valueKey" will be deprecated in 1.1.0`),re="value"):st(f)&&(or(!1,`Use "dataKey" to specify the value of pie,
      the props "valueKey" will be deprecated in 1.1.0`),re=P);var k=r.filter(function(U){return at(U,re,0)!==0}).length,le=(O>=360?k:k-1)*y,G=O-k*Z-le,L=r.reduce(function(U,ue){var X=at(ue,re,0);return U+(Le(X)?X:0)},0),z;if(L>0){var be;z=r.map(function(U,ue){var X=at(U,re,0),fe=at(U,R,ue),se=(Le(X)?X:0)/L,ye;ue?ye=be.endAngle+Et($)*y*(X!==0?1:0):ye=l;var S=ye+Et($)*((X!==0?Z:0)+se*G),ve=(ye+S)/2,C=(v.innerRadius+v.outerRadius)/2,J=[{name:fe,value:X,payload:U,dataKey:re,type:M}],ut=Kt(v.cx,v.cy,C,ve);return be=oe(oe(oe({percent:se,cornerRadius:m,name:fe,tooltipPayload:J,midAngle:ve,middleRadius:C,tooltipPosition:ut},U),v),{},{value:at(U,re),startAngle:ye,endAngle:S,payload:U,paddingAngle:Et($)*y}),be})}return oe(oe({},v),{},{sectors:z,data:r})});var ma=["layout","type","stroke","connectNulls","isRange","ref"],xa=["key"],Nr;function bt(a){"@babel/helpers - typeof";return bt=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},bt(a)}function wr(a,n){if(a==null)return{};var o=pa(a,n),i,r;if(Object.getOwnPropertySymbols){var m=Object.getOwnPropertySymbols(a);for(r=0;r<m.length;r++)i=m[r],!(n.indexOf(i)>=0)&&Object.prototype.propertyIsEnumerable.call(a,i)&&(o[i]=a[i])}return o}function pa(a,n){if(a==null)return{};var o={};for(var i in a)if(Object.prototype.hasOwnProperty.call(a,i)){if(n.indexOf(i)>=0)continue;o[i]=a[i]}return o}function ct(){return ct=Object.assign?Object.assign.bind():function(a){for(var n=1;n<arguments.length;n++){var o=arguments[n];for(var i in o)Object.prototype.hasOwnProperty.call(o,i)&&(a[i]=o[i])}return a},ct.apply(this,arguments)}function mr(a,n){var o=Object.keys(a);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(a);n&&(i=i.filter(function(r){return Object.getOwnPropertyDescriptor(a,r).enumerable})),o.push.apply(o,i)}return o}function et(a){for(var n=1;n<arguments.length;n++){var o=arguments[n]!=null?arguments[n]:{};n%2?mr(Object(o),!0).forEach(function(i){Ye(a,i,o[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(o)):mr(Object(o)).forEach(function(i){Object.defineProperty(a,i,Object.getOwnPropertyDescriptor(o,i))})}return a}function ha(a,n){if(!(a instanceof n))throw new TypeError("Cannot call a class as a function")}function xr(a,n){for(var o=0;o<n.length;o++){var i=n[o];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(a,kr(i.key),i)}}function ga(a,n,o){return n&&xr(a.prototype,n),o&&xr(a,o),Object.defineProperty(a,"prototype",{writable:!1}),a}function ba(a,n,o){return n=Dt(n),ua(a,Ar()?Reflect.construct(n,o||[],Dt(a).constructor):n.apply(a,o))}function ua(a,n){if(n&&(bt(n)==="object"||typeof n=="function"))return n;if(n!==void 0)throw new TypeError("Derived constructors may only return object or undefined");return fa(a)}function fa(a){if(a===void 0)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return a}function Ar(){try{var a=!Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],function(){}))}catch{}return(Ar=function(){return!!a})()}function Dt(a){return Dt=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(o){return o.__proto__||Object.getPrototypeOf(o)},Dt(a)}function ya(a,n){if(typeof n!="function"&&n!==null)throw new TypeError("Super expression must either be null or a function");a.prototype=Object.create(n&&n.prototype,{constructor:{value:a,writable:!0,configurable:!0}}),Object.defineProperty(a,"prototype",{writable:!1}),n&&Ut(a,n)}function Ut(a,n){return Ut=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(i,r){return i.__proto__=r,i},Ut(a,n)}function Ye(a,n,o){return n=kr(n),n in a?Object.defineProperty(a,n,{value:o,enumerable:!0,configurable:!0,writable:!0}):a[n]=o,a}function kr(a){var n=va(a,"string");return bt(n)=="symbol"?n:n+""}function va(a,n){if(bt(a)!="object"||!a)return a;var o=a[Symbol.toPrimitive];if(o!==void 0){var i=o.call(a,n);if(bt(i)!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(a)}var nt=function(a){function n(){var o;ha(this,n);for(var i=arguments.length,r=new Array(i),m=0;m<i;m++)r[m]=arguments[m];return o=ba(this,n,[].concat(r)),Ye(o,"state",{isAnimationFinished:!0}),Ye(o,"id",ur("recharts-area-")),Ye(o,"handleAnimationEnd",function(){var l=o.props.onAnimationEnd;o.setState({isAnimationFinished:!0}),rt(l)&&l()}),Ye(o,"handleAnimationStart",function(){var l=o.props.onAnimationStart;o.setState({isAnimationFinished:!1}),rt(l)&&l()}),o}return ya(n,a),ga(n,[{key:"renderDots",value:function(i,r,m){var l=this.props.isAnimationActive,h=this.state.isAnimationFinished;if(l&&!h)return null;var y=this.props,f=y.dot,R=y.points,P=y.dataKey,M=He(this.props,!1),Z=He(f,!0),v=R.map(function(O,re){var k=et(et(et({key:"dot-".concat(re),r:3},M),Z),{},{index:re,cx:O.x,cy:O.y,dataKey:P,value:O.value,payload:O.payload,points:R});return n.renderDotItem(f,k)}),$={clipPath:i?"url(#clipPath-".concat(r?"":"dots-").concat(m,")"):null};return W.createElement(Ie,ct({className:"recharts-area-dots"},$),v)}},{key:"renderHorizontalRect",value:function(i){var r=this.props,m=r.baseLine,l=r.points,h=r.strokeWidth,y=l[0].x,f=l[l.length-1].x,R=i*Math.abs(y-f),P=Pt(l.map(function(M){return M.y||0}));return Le(m)&&typeof m=="number"?P=Math.max(m,P):m&&Array.isArray(m)&&m.length&&(P=Math.max(Pt(m.map(function(M){return M.y||0})),P)),Le(P)?W.createElement("rect",{x:y<f?y:y-R,y:0,width:R,height:Math.floor(P+(h?parseInt("".concat(h),10):1))}):null}},{key:"renderVerticalRect",value:function(i){var r=this.props,m=r.baseLine,l=r.points,h=r.strokeWidth,y=l[0].y,f=l[l.length-1].y,R=i*Math.abs(y-f),P=Pt(l.map(function(M){return M.x||0}));return Le(m)&&typeof m=="number"?P=Math.max(m,P):m&&Array.isArray(m)&&m.length&&(P=Math.max(Pt(m.map(function(M){return M.x||0})),P)),Le(P)?W.createElement("rect",{x:0,y:y<f?y:y-R,width:P+(h?parseInt("".concat(h),10):1),height:Math.floor(R)}):null}},{key:"renderClipRect",value:function(i){var r=this.props.layout;return r==="vertical"?this.renderVerticalRect(i):this.renderHorizontalRect(i)}},{key:"renderAreaStatically",value:function(i,r,m,l){var h=this.props,y=h.layout,f=h.type,R=h.stroke,P=h.connectNulls,M=h.isRange;h.ref;var Z=wr(h,ma);return W.createElement(Ie,{clipPath:m?"url(#clipPath-".concat(l,")"):null},W.createElement(Tt,ct({},He(Z,!0),{points:i,connectNulls:P,type:f,baseLine:r,layout:y,stroke:"none",className:"recharts-area-area"})),R!=="none"&&W.createElement(Tt,ct({},He(this.props,!1),{className:"recharts-area-curve",layout:y,type:f,connectNulls:P,fill:"none",points:i})),R!=="none"&&M&&W.createElement(Tt,ct({},He(this.props,!1),{className:"recharts-area-curve",layout:y,type:f,connectNulls:P,fill:"none",points:r})))}},{key:"renderAreaWithAnimation",value:function(i,r){var m=this,l=this.props,h=l.points,y=l.baseLine,f=l.isAnimationActive,R=l.animationBegin,P=l.animationDuration,M=l.animationEasing,Z=l.animationId,v=this.state,$=v.prevPoints,O=v.prevBaseLine;return W.createElement(gr,{begin:R,duration:P,isActive:f,easing:M,from:{t:0},to:{t:1},key:"area-".concat(Z),onAnimationEnd:this.handleAnimationEnd,onAnimationStart:this.handleAnimationStart},function(re){var k=re.t;if($){var le=$.length/h.length,G=h.map(function(U,ue){var X=Math.floor(ue*le);if($[X]){var fe=$[X],se=tt(fe.x,U.x),ye=tt(fe.y,U.y);return et(et({},U),{},{x:se(k),y:ye(k)})}return U}),L;if(Le(y)&&typeof y=="number"){var z=tt(O,y);L=z(k)}else if(st(y)||qr(y)){var be=tt(O,0);L=be(k)}else L=y.map(function(U,ue){var X=Math.floor(ue*le);if(O[X]){var fe=O[X],se=tt(fe.x,U.x),ye=tt(fe.y,U.y);return et(et({},U),{},{x:se(k),y:ye(k)})}return U});return m.renderAreaStatically(G,L,i,r)}return W.createElement(Ie,null,W.createElement("defs",null,W.createElement("clipPath",{id:"animationClipPath-".concat(r)},m.renderClipRect(k))),W.createElement(Ie,{clipPath:"url(#animationClipPath-".concat(r,")")},m.renderAreaStatically(h,y,i,r)))})}},{key:"renderArea",value:function(i,r){var m=this.props,l=m.points,h=m.baseLine,y=m.isAnimationActive,f=this.state,R=f.prevPoints,P=f.prevBaseLine,M=f.totalLength;return y&&l&&l.length&&(!R&&M>0||!Wt(R,l)||!Wt(P,h))?this.renderAreaWithAnimation(i,r):this.renderAreaStatically(l,h,i,r)}},{key:"render",value:function(){var i,r=this.props,m=r.hide,l=r.dot,h=r.points,y=r.className,f=r.top,R=r.left,P=r.xAxis,M=r.yAxis,Z=r.width,v=r.height,$=r.isAnimationActive,O=r.id;if(m||!h||!h.length)return null;var re=this.state.isAnimationFinished,k=h.length===1,le=kt("recharts-area",y),G=P&&P.allowDataOverflow,L=M&&M.allowDataOverflow,z=G||L,be=st(O)?this.id:O,U=(i=He(l,!1))!==null&&i!==void 0?i:{r:3,strokeWidth:2},ue=U.r,X=ue===void 0?3:ue,fe=U.strokeWidth,se=fe===void 0?2:fe,ye=Qr(l)?l:{},S=ye.clipDot,ve=S===void 0?!0:S,C=X*2+se;return W.createElement(Ie,{className:le},G||L?W.createElement("defs",null,W.createElement("clipPath",{id:"clipPath-".concat(be)},W.createElement("rect",{x:G?R:R-Z/2,y:L?f:f-v/2,width:G?Z:Z*2,height:L?v:v*2})),!ve&&W.createElement("clipPath",{id:"clipPath-dots-".concat(be)},W.createElement("rect",{x:R-C/2,y:f-C/2,width:Z+C,height:v+C}))):null,k?null:this.renderArea(z,be),(l||k)&&this.renderDots(z,ve,be),(!$||re)&&br.renderCallByParent(this.props,h))}}],[{key:"getDerivedStateFromProps",value:function(i,r){return i.animationId!==r.prevAnimationId?{prevAnimationId:i.animationId,curPoints:i.points,curBaseLine:i.baseLine,prevPoints:r.curPoints,prevBaseLine:r.curBaseLine}:i.points!==r.curPoints||i.baseLine!==r.curBaseLine?{curPoints:i.points,curBaseLine:i.baseLine}:null}}])}(K.PureComponent);Nr=nt;Ye(nt,"displayName","Area");Ye(nt,"defaultProps",{stroke:"#3182bd",fill:"#3182bd",fillOpacity:.6,xAxisId:0,yAxisId:0,legendType:"line",connectNulls:!1,points:[],dot:!1,activeDot:!0,hide:!1,isAnimationActive:!fr.isSsr,animationBegin:0,animationDuration:1500,animationEasing:"ease"});Ye(nt,"getBaseValue",function(a,n,o,i){var r=a.layout,m=a.baseValue,l=n.props.baseValue,h=l??m;if(Le(h)&&typeof h=="number")return h;var y=r==="horizontal"?i:o,f=y.scale.domain();if(y.type==="number"){var R=Math.max(f[0],f[1]),P=Math.min(f[0],f[1]);return h==="dataMin"?P:h==="dataMax"||R<0?R:Math.max(Math.min(f[0],f[1]),0)}return h==="dataMin"?f[0]:h==="dataMax"?f[1]:f[0]});Ye(nt,"getComposedData",function(a){var n=a.props,o=a.item,i=a.xAxis,r=a.yAxis,m=a.xAxisTicks,l=a.yAxisTicks,h=a.bandSize,y=a.dataKey,f=a.stackedData,R=a.dataStartIndex,P=a.displayedData,M=a.offset,Z=n.layout,v=f&&f.length,$=Nr.getBaseValue(n,o,i,r),O=Z==="horizontal",re=!1,k=P.map(function(G,L){var z;v?z=f[R+L]:(z=at(G,y),Array.isArray(z)?re=!0:z=[$,z]);var be=z[1]==null||v&&at(G,y)==null;return O?{x:lr({axis:i,ticks:m,bandSize:h,entry:G,index:L}),y:be?null:r.scale(z[1]),value:z,payload:G}:{x:be?null:i.scale(z[1]),y:lr({axis:r,ticks:l,bandSize:h,entry:G,index:L}),value:z,payload:G}}),le;return v||re?le=k.map(function(G){var L=Array.isArray(G.value)?G.value[0]:null;return O?{x:G.x,y:L!=null&&G.y!=null?r.scale(L):null}:{x:L!=null?i.scale(L):null,y:G.y}}):le=O?r.scale($):i.scale($),et({points:k,baseLine:le,layout:Z,isRange:re},M)});Ye(nt,"renderDotItem",function(a,n){var o;if(W.isValidElement(a))o=W.cloneElement(a,n);else if(rt(a))o=a(n);else{var i=kt("recharts-area-dot",typeof a!="boolean"?a.className:""),r=n.key,m=wr(n,xa);o=W.createElement(Xr,ct({},m,{key:r,className:i}))}return o});var pr=yr({chartName:"PieChart",GraphicalChild:Ve,validateTooltipEventTypes:["item"],defaultTooltipEventType:"item",legendContent:"children",axisComponents:[{axisType:"angleAxis",AxisComp:Zr},{axisType:"radiusAxis",AxisComp:ea}],formatAxisMap:ta,defaultProps:{layout:"centric",startAngle:0,endAngle:360,cx:"50%",cy:"50%",innerRadius:0,outerRadius:"80%"}}),ja=yr({chartName:"AreaChart",GraphicalChild:nt,axisComponents:[{axisType:"xAxis",AxisComp:$e},{axisType:"yAxis",AxisComp:Se}],formatAxisMap:ra}),Na={};const wa=({courseInfo:a={},calculations:n={},coMarkAllocations:o={},activeCOs:i=[],activePOs:r=[],coMapping:m={},targetPassMarks:l=40,kpiCO:h=50,kpiPO:y=50,dbCourseOutcomes:f=[],dbProgramOutcomes:R=[],coDescriptions:P={},poDescriptions:M={}})=>{const Z=T=>{const N=[[10,"x"],[9,"ix"],[5,"v"],[4,"iv"],[1,"i"]];let B="";for(const[ee,de]of N)for(;T>=ee;)B+=de,T-=ee;return B},v=a.courseTitle||"Object Oriented Programming Language",$=a.courseCode||"CSE 213",O=`SWOT_CACHE_${$}_${v}`,k=(T=>{const N=T.toLowerCase();return N.includes("algorithm")?{domain:"Algorithm Design",skill:"Algorithmic Problem Solving",topics:"dynamic programming, greedy strategies, and graph algorithms"}:N.includes("object oriented")||N.includes("oop")||N.includes("c++")?{domain:"OOP Concepts",skill:"Advanced C++ Skills",topics:"templates, exception handling, and dynamic memory management"}:N.includes("database")||N.includes("dbms")?{domain:"Database Modeling",skill:"SQL & Database Optimization",topics:"normalization, SQL queries, and transaction management"}:N.includes("data structure")?{domain:"Data Structures",skill:"Data Structure Implementation",topics:"trees, graphs, hashing, and complexity analysis"}:N.includes("software")||N.includes("engineering")?{domain:"Software Engineering",skill:"Software Design & Architecture",topics:"design patterns, UML modeling, and version control"}:{domain:"Course Core Competencies",skill:"Advanced Technical Skills",topics:"complex problem solving and advanced analytical techniques"}})(v),le=K.useMemo(()=>{const T=(n==null?void 0:n.coAttainment)||{};n!=null&&n.poAttainment;const N=i.map(E=>{var j,xe;return{code:E,passPct:((j=T[E])==null?void 0:j.passMarksPercentage)||0,kpiPct:((xe=T[E])==null?void 0:xe.kpiPercentage)||0,desc:P[E]||`Course Outcome ${E}`}}).sort((E,j)=>j.kpiPct-E.kpiPct),B=i.map(E=>{var j,xe;return{code:E,passPct:((j=T[E])==null?void 0:j.passMarksPercentage)||0,kpiPct:((xe=T[E])==null?void 0:xe.kpiPercentage)||0,desc:P[E]||`Course Outcome ${E}`}}).filter(E=>(o[E.code]||0)>0).sort((E,j)=>E.kpiPct-j.kpiPct),ee=Array.from({length:12},(E,j)=>`CO${j+1}`),de=Array.from({length:12},(E,j)=>`PO${j+1}`),D=ee.filter(E=>!i.includes(E)||(o[E]||0)===0),ce=de.filter(E=>!r.includes(E)),Y=E=>r.filter(j=>{var xe,je;return((xe=m==null?void 0:m[E])==null?void 0:xe[j])===1||((je=m==null?void 0:m[E])==null?void 0:je[j])==="1"}),te=[],q=N[0],ge=N[1]||N[0],pe=N[2]||N[1]||N[0];if(q){const E=Y(q.code),j=E.length>0?E.join(", "):"PO1, PO2";te.push({title:`Outstanding Practical Application (${q.code}, ${j})`,bullets:[`${q.passPct.toFixed(1)}% of students exceed the ${l}% pass mark and ${q.kpiPct.toFixed(1)}% exceed the ${h}% KPI in applying ${v.toLowerCase()} concepts to solve real-life problems (${q.code}).`,`Attainment in mapped program outcomes (${j}) demonstrates strong analytical and application capabilities.`,`Implication: The course strongly supports students' ability to translate theoretical ${v.toLowerCase()} concepts into practical problem-solving skills, which aligns well with industry expectations.`]})}if(ge&&ge.code!==(q==null?void 0:q.code)){const E=Y(ge.code),j=E.length>0?E.join(", "):"PO9";te.push({title:`Excellent Teamwork and Collaboration (${ge.code}, ${j})`,bullets:[`${ge.passPct.toFixed(1)}% of students exceed both ${l}% pass mark and ${h}% KPI in teamwork and collaborative activities (${ge.code}).`,`High attainment in ${j} demonstrates strong development of teamwork skills.`,"Implication: Group assignments, presentations, and collaborative programming activities effectively foster professional teamwork skills among students."]})}if(pe&&pe.code!==(q==null?void 0:q.code)&&pe.code!==(ge==null?void 0:ge.code)){const E=Y(pe.code),j=E.length>0?E.join(", "):"PO1";te.push({title:`Strong Foundation in Core ${k.domain} (${pe.code}, ${j})`,bullets:[`${pe.passPct.toFixed(1)}% > ${l}% and ${pe.kpiPct.toFixed(1)}% > ${h}% in understanding fundamental ${v.toLowerCase()} principles (${pe.code}).`,`Attainment in engineering knowledge (${j}) is high.`,"Alignment: The course successfully establishes strong foundational knowledge consistent with program learning expectations."]})}const Je=[],me=B.find(E=>E.kpiPct<h)||B[B.length-1];if(me&&Je.push({title:`Moderate ${k.skill} Proficiency (${me.code})`,bullets:[`${me.passPct.toFixed(1)}% of students exceed the ${l}% pass mark, but only ${me.kpiPct.toFixed(1)}% exceed the ${h}% KPI for solving programming problems using ${k.topics} (${me.code}).`,`Gap: Although most students meet the minimum requirement, many struggle with deeper understanding of advanced features such as ${k.topics}.`]}),D.length>0||ce.length>0){const E=D.length>0?`${D[0]}–${D[D.length-1]}`:"CO5-CO12",j=ce.length>0?`${ce[0]}–${ce[ce.length-1]}`:"PO3-PO12";Je.push({title:"Limited Coverage of Additional COs and POs",bullets:[`${E} and ${j} show 0% attainment, indicating that these outcomes were not assessed in this course.`,"Risk: Lack of assessment for some program outcomes may reduce the overall balance of outcome evaluation within the course."]})}const Te=[{title:`Leverage ${(q==null?void 0:q.code)||"CO4"} and ${Y(q==null?void 0:q.code)[0]||"PO2"} Success`,bullets:["The strong attainment in real-life application and problem-solving suggests that practical teaching strategies are highly effective.",`These strategies (e.g., project-based learning, real-life programming examples) can be applied to improve ${(me==null?void 0:me.code)||"CO2"} performance in ${k.topics}.`]},{title:`Enhance ${k.skill}`,bullets:[`Introduce mini programming projects and debugging exercises focusing on ${k.topics}.`,`Practical coding sessions may increase KPI attainment in ${(me==null?void 0:me.code)||"CO2"}.`]},{title:"Strengthen Collaborative Learning",bullets:["Since teamwork outcomes show excellent performance, introducing peer evaluation and pair programming activities can further enhance collaborative learning experiences."]}],ot=[{title:`Improve ${(me==null?void 0:me.code)||"CO2"} Attainment (${k.skill})`,bullets:[`Introduce 2–3 challenge-based programming labs focusing on ${k.topics}.`,"Use stepwise problem-solving exercises (basic → intermediate → advanced).","Encourage practice through online coding platforms."]},{title:"Expand Outcome Coverage",bullets:["Integrate small activities that contribute to additional program outcomes such as:","• Ethical considerations in software development","• Documentation and software version control."]},{title:"Continuous Concept Reinforcement",bullets:[`Incorporate short quizzes and coding demonstrations during lectures to reinforce important ${v.toLowerCase()} concepts.`]}],qe=[{title:"Overemphasis on Limited Outcomes",bullets:["High focus on CO1–CO4 and PO1, PO2, PO9 may result in limited exposure to other program outcomes.","Mitigation: Future course design should integrate activities covering additional POs such as ethics, modern tools, and professional responsibility."]},{title:"Advanced Skill Gap Affecting Industry Readiness",bullets:[`Moderate KPI attainment in ${(me==null?void 0:me.code)||"CO2"} suggests some students may lack confidence in implementing ${k.topics}.`,"Solution: Encourage more hands-on coding practice and project-based assignments."]}],ft=`The course demonstrates excellent performance in practical application (${(q==null?void 0:q.code)||"CO4"}/${Y(q==null?void 0:q.code)[0]||"PO2"}), teamwork development (${(ge==null?void 0:ge.code)||"CO3"}/${Y(ge==null?void 0:ge.code)[0]||"PO9"}), and foundational ${k.domain.toLowerCase()} (${(pe==null?void 0:pe.code)||"CO1"}/${Y(pe==null?void 0:pe.code)[0]||"PO1"}). However, advanced ${k.skill.toLowerCase()} (${(me==null?void 0:me.code)||"CO2"}) show comparatively lower KPI attainment, indicating the need for additional hands-on exercises and challenge-based learning. Expanding the assessment of additional program outcomes will further strengthen the course's alignment with program objectives and accreditation expectations. Continuous improvement through practical programming tasks and real-world applications will enhance both student competency and industry readiness.`;return{strengths:te,weaknesses:Je,opportunities:Te,recommendations:ot,threats:qe,conclusion:ft}},[n,i,r,o,m,l,h,y,P,M,v,$]),[G,L]=K.useState(null),[z,be]=K.useState(!1),[U,ue]=K.useState(!1),[X,fe]=K.useState("gemini"),se=G||le,ye=async(T=!1)=>{var B,ee,de,D,ce;if(!T){const Y=localStorage.getItem(O);if(Y)try{const te=JSON.parse(Y);if(te!=null&&te.strengths&&(te!=null&&te.weaknesses)&&(te!=null&&te.conclusion)){L(te),fe("gemini"),ue(!1);return}}catch(te){console.warn("Failed to parse cached SWOT data:",te)}}const N=(typeof process<"u"?Na.GEMINI_API_KEY:"")||localStorage.getItem("OBE_GEMINI_API_KEY")||"";ue(!0);try{const Y=a.semesterName&&a.academicYear?a.semesterName.includes(String(a.academicYear))?a.semesterName:`${a.semesterName} ${a.academicYear}`:"Spring 2026",te=i.map(j=>{var xe,je,Pe,De,Xe,Ze;return{code:j,description:P[j]||`Course Outcome ${j}`,passPercentage:(((je=(xe=n==null?void 0:n.coAttainment)==null?void 0:xe[j])==null?void 0:je.passMarksPercentage)||0).toFixed(1)+"%",kpiPercentage:(((De=(Pe=n==null?void 0:n.coAttainment)==null?void 0:Pe[j])==null?void 0:De.kpiPercentage)||0).toFixed(1)+"%",attained:(((Ze=(Xe=n==null?void 0:n.coAttainment)==null?void 0:Xe[j])==null?void 0:Ze.kpiPercentage)||0)>=h}}),q=r.map(j=>{var xe,je,Pe,De,Xe,Ze;return{code:j,description:M[j]||`Program Outcome ${j}`,passPercentage:(((je=(xe=n==null?void 0:n.poAttainment)==null?void 0:xe[j])==null?void 0:je.passMarksPercentage)||0).toFixed(1)+"%",kpiPercentage:(((De=(Pe=n==null?void 0:n.poAttainment)==null?void 0:Pe[j])==null?void 0:De.kpiPercentage)||0).toFixed(1)+"%",attained:(((Ze=(Xe=n==null?void 0:n.poAttainment)==null?void 0:Xe[j])==null?void 0:Ze.kpiPercentage)||0)>=y}}),ge=Array.from({length:12},(j,xe)=>`CO${xe+1}`),pe=Array.from({length:12},(j,xe)=>`PO${xe+1}`),Je=ge.filter(j=>!i.includes(j)||(o[j]||0)===0).join(", ")||"None",me=pe.filter(j=>!r.includes(j)).join(", ")||"None",Te=G?`
TEACHER'S CURRENT DRAFT & CUSTOM ADDED NOTES (IMPORTANT):
The teacher may have added custom points, notes, or new topics. You MUST preserve and include all custom points added by the teacher, but rewrite their phrasing into highly academic, professional, course-oriented prose:
${JSON.stringify(G,null,2)}
`:"",ot=`System Role: You are a Senior Academic OBE Accreditation Consultant and CSE University Professor.
Your task is to write a deeply course-specific, highly professional, non-generic SWOT Analysis report for an Outcome-Based Education (OBE) course file submission at Bangladesh Army International University of Science and Technology (BAIUST), Cumilla.

CRITICAL INSTRUCTIONS:
1. Customize every single bullet point, title, gap analysis, recommendation, threat, and solution to the EXACT subject matter of "${v}" (${$}) using domain-specific technical terminology (e.g. for Object Oriented Programming: inheritance, polymorphism, C++ templates, exception handling, dynamic memory; for Algorithms: divide & conquer, greedy strategies, dynamic programming, asymptotic complexity, graph algorithms; etc.).
2. TEACHER CUSTOM INPUT RULE: ${Te?"Preserve and incorporate all teacher-added custom points and bullet notes from the provided Teacher Draft below, but polish and rewrite every item into professional academic prose.":"Generate a complete, course-oriented academic report."}

${Te}

Course Details:
- Course Code: ${$}
- Course Title: ${v}
- Department: Department of Computer Science and Engineering
- Institution: BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA
- Academic Session: ${Y}
- Pass Mark Threshold: ${l}%
- CO KPI Target Threshold: ${h}%
- PO KPI Target Threshold: ${y}%

Course Outcomes (CO) & Attainments with Descriptions:
${JSON.stringify(te,null,2)}

Program Outcomes (PO) & Attainments with Descriptions:
${JSON.stringify(q,null,2)}

Active CO-PO Mappings:
${JSON.stringify(m,null,2)}

Unassessed Outcomes:
- Unassessed COs: ${Je}
- Unassessed POs: ${me}

REQUIRED DOCUMENT STRUCTURE (JSON output):
Return ONLY a valid JSON object (no markdown backticks, no code fence wrapper) matching this EXACT schema:

{
  "strengths": [
    {
      "title": "Course-specific strength title with CO/PO codes, e.g. Outstanding Practical Application (CO4, PO2)",
      "bullets": [
        "X% of students exceed the ${l}% pass mark and Y% exceed the ${h}% KPI in applying [specific course subject concepts] to solve real-life problems ([CO_code]).",
        "X% > ${l}% and Y% > ${y}% in [specific PO description].",
        "Implication: The course strongly supports students' ability to translate theoretical [course title] concepts into practical problem-solving skills, which aligns well with industry expectations."
      ]
    }
  ],
  "weaknesses": [
    {
      "title": "Course-specific weak topic title, e.g. Moderate Advanced Programming Proficiency (CO2)",
      "bullets": [
        "X% of students exceed the ${l}% pass mark, but only Y% exceed the ${h}% KPI for solving programming problems using advanced [specific course features].",
        "Gap: Although most students meet the minimum requirement, many struggle with deeper understanding of advanced features such as [list 2-3 specific topics]."
      ]
    }
  ],
  "opportunities": [
    {
      "title": "Leverage [High CO] and [High PO] Success",
      "bullets": [
        "The strong attainment in real-life application and problem-solving suggests that practical teaching strategies are highly effective. These strategies can be applied to improve [Low CO] performance in advanced [subject area]."
      ]
    }
  ],
  "recommendations": [
    {
      "title": "Improve [Low CO] Attainment (Advanced [Subject Skill])",
      "bullets": [
        "Introduce 2–3 challenge-based programming labs focusing on advanced [subject] features.",
        "Use stepwise problem-solving exercises (basic → intermediate → advanced).",
        "Encourage practice through online coding platforms."
      ]
    }
  ],
  "threats": [
    {
      "title": "Overemphasis on Limited Outcomes",
      "bullets": [
        "High focus on primary COs/POs may result in limited exposure to other program outcomes.",
        "Mitigation: Future course design should integrate activities covering additional POs."
      ]
    }
  ],
  "conclusion": "A single, highly professional academic paragraph summarizing strengths, weak areas, and continuous improvement recommendations specifically for ${v} (${$})."
}`;let qe="";try{const j=localStorage.getItem("obe-auth-token"),je=typeof window<"u"&&!window.location.hostname.includes("localhost")&&!window.location.hostname.includes("127.0.0.1")?"https://student-outcome-analyzer-api.onrender.com":"",Pe=await fetch(`${je}/api/ai/swot-generate`,{method:"POST",headers:{"Content-Type":"application/json",...j?{Authorization:`Bearer ${j}`}:{}},body:JSON.stringify({promptText:ot})}),De=await Pe.json();Pe.ok&&De.success&&De.content&&(qe=De.content)}catch(j){console.warn("Backend SWOT AI Proxy unavailable, attempting direct client fetch:",j.message)}if(!qe&&N){const j=[`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(N)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${encodeURIComponent(N)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(N)}`,`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${encodeURIComponent(N)}`];for(const xe of j)try{const je=await fetch(xe,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":N},body:JSON.stringify({contents:[{parts:[{text:ot}]}],generationConfig:{temperature:.85}})}),Pe=await je.json();if(je.ok&&((ce=(D=(de=(ee=(B=Pe.candidates)==null?void 0:B[0])==null?void 0:ee.content)==null?void 0:de.parts)==null?void 0:D[0])!=null&&ce.text)){qe=Pe.candidates[0].content.parts[0].text;break}}catch(je){console.warn("Client fetch endpoint error:",je.message)}}if(!qe)throw new Error("Unable to connect to Gemini AI service. Please check API key.");const ft=qe.replace(/^```json\s*/i,"").replace(/```\s*$/i,"").trim(),E=JSON.parse(ft);if(E.strengths&&E.weaknesses&&E.conclusion){L(E),fe("gemini");try{localStorage.setItem(O,JSON.stringify(E))}catch(j){console.warn("LocalStorage save failed:",j)}}else throw new Error("Invalid JSON layout from Gemini")}catch(Y){console.warn("Gemini AI SWOT Fetch Error:",Y.message),L(le),fe("calculated")}finally{ue(!1)}};K.useEffect(()=>{ye(!1)},[a.courseCode,a.courseTitle]);const S=()=>{ye(!0)},ve=(T,N,B,ee)=>{const de=JSON.parse(JSON.stringify(se));B==="title"?de[T][N].title=ee:B==="bullet"&&(de[T][N].bullets[ee[0]]=ee[1]),L(de);try{localStorage.setItem(O,JSON.stringify(de))}catch{}},C=T=>{const N=JSON.parse(JSON.stringify(se));N[T]||(N[T]=[]),N[T].push({title:`Custom ${T.charAt(0).toUpperCase()+T.slice(1)} Point`,bullets:[`Enter custom teacher note or topic for ${v}...`]}),L(N);try{localStorage.setItem(O,JSON.stringify(N))}catch{}},J=(T,N)=>{const B=JSON.parse(JSON.stringify(se));if(B[T]&&B[T].length>N){B[T].splice(N,1),L(B);try{localStorage.setItem(O,JSON.stringify(B))}catch{}}},ut=(T,N)=>{const B=JSON.parse(JSON.stringify(se));if(B[T]&&B[T][N]){B[T][N].bullets||(B[T][N].bullets=[]),B[T][N].bullets.push("Enter additional detail or note..."),L(B);try{localStorage.setItem(O,JSON.stringify(B))}catch{}}},he=(T,N,B)=>{const ee=JSON.parse(JSON.stringify(se));if(ee[T]&&ee[T][N]&&ee[T][N].bullets){ee[T][N].bullets.splice(B,1),L(ee);try{localStorage.setItem(O,JSON.stringify(ee))}catch{}}},F=T=>{const N=JSON.parse(JSON.stringify(se));N.conclusion=T,L(N);try{localStorage.setItem(O,JSON.stringify(N))}catch{}},it=()=>{window.print()},ne=()=>{const T=a.semesterName&&a.academicYear?a.semesterName.includes(String(a.academicYear))?a.semesterName:`${a.semesterName} ${a.academicYear}`:"Spring 2026";let N=`
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>SWOT Analysis Report</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; margin: 40px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; }
          .header-table td { border: none !important; padding: 2px; }
          .uni-name-bn { font-size: 14pt; font-weight: bold; color: #000; }
          .uni-name-en { font-size: 11pt; font-weight: bold; color: #000; }
          .dept-name { font-size: 11pt; font-weight: bold; }
          .meta-line { font-size: 11pt; font-weight: bold; margin-top: 4px; }
          .doc-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 10px; text-align: center; text-decoration: underline; }
          h3 { font-size: 12pt; font-weight: bold; margin-top: 16px; margin-bottom: 8px; }
          ol { margin-left: 20px; padding-left: 0; }
          li { margin-bottom: 8px; list-style-type: lower-roman; font-weight: bold; }
          ul { margin-left: 20px; padding-left: 0; font-weight: normal; }
          ul li { list-style-type: disc; margin-bottom: 4px; font-weight: normal; }
          .conclusion { margin-top: 16px; text-align: justify; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <img src="${ir}" width="60" height="60" alt="Logo" /><br/>
              <div class="uni-name-bn">বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি, কুমিল্লা</div>
              <div class="uni-name-en">BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA</div>
              <div class="dept-name">Department of Computer Science and Engineering</div>
              <div class="meta-line">${T}</div>
              <div class="meta-line">Course Code: ${$}</div>
              <div class="meta-line">Course Title: ${v}</div>
            </td>
          </tr>
        </table>

        <div class="doc-title">SWOT Analysis</div>

        <h3>1. Strengths</h3>
        <ol>
          ${se.strengths.map(D=>`
            <li>
              <strong>${D.title}</strong>
              <ul>
                ${D.bullets.map(ce=>`<li>${ce}</li>`).join("")}
              </ul>
            </li>
          `).join("")}
        </ol>

        <h3>2. Weaknesses</h3>
        <ol>
          ${se.weaknesses.map(D=>`
            <li>
              <strong>${D.title}</strong>
              <ul>
                ${D.bullets.map(ce=>`<li>${ce}</li>`).join("")}
              </ul>
            </li>
          `).join("")}
        </ol>

        <h3>3. Opportunities</h3>
        <ol>
          ${se.opportunities.map(D=>`
            <li>
              <strong>${D.title}</strong>
              <ul>
                ${D.bullets.map(ce=>`<li>${ce}</li>`).join("")}
              </ul>
            </li>
          `).join("")}
        </ol>

        <h3>4. Recommendations</h3>
        <ol>
          ${se.recommendations.map(D=>`
            <li>
              <strong>${D.title}</strong>
              <ul>
                ${D.bullets.map(ce=>`<li>${ce}</li>`).join("")}
              </ul>
            </li>
          `).join("")}
        </ol>

        <h3>5. Threats</h3>
        <ol>
          ${se.threats.map(D=>`
            <li>
              <strong>${D.title}</strong>
              <ul>
                ${D.bullets.map(ce=>`<li>${ce}</li>`).join("")}
              </ul>
            </li>
          `).join("")}
        </ol>

        <h3>Conclusion</h3>
        <p class="conclusion">${se.conclusion}</p>
      </body>
      </html>
    `;const B=new Blob(["\uFEFF"+N],{type:"application/msword"}),ee=URL.createObjectURL(B),de=document.createElement("a");de.href=ee,de.download=`SWOT_Analysis_${$}.doc`,document.body.appendChild(de),de.click(),document.body.removeChild(de),URL.revokeObjectURL(ee)},We=a.semesterName&&a.academicYear?a.semesterName.includes(String(a.academicYear))?a.semesterName:`${a.semesterName} ${a.academicYear}`:"Spring 2026",H=(T,N,B)=>{const ee=se[T]||[];return e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsxs("h4",{className:"text-base font-extrabold text-black",children:[B,". ",N]}),z&&e.jsxs("button",{onClick:()=>C(T),className:"flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all no-print shadow-sm",title:`Add new point under ${N}`,children:[e.jsx(rr,{size:13}),e.jsx("span",{children:"Add Point"})]})]}),e.jsx("div",{className:"space-y-3 pl-4",children:ee.map((de,D)=>e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"font-bold flex items-center gap-2",children:[e.jsxs("span",{className:"flex-shrink-0",children:[Z(D+1),"."]}),z?e.jsxs("div",{className:"flex items-center gap-2 w-full",children:[e.jsx("input",{type:"text",value:de.title,onChange:ce=>ve(T,D,"title",ce.target.value),className:"w-full border-b border-gray-400 font-bold px-1.5 py-0.5 outline-none text-sm font-serif bg-amber-50/40 rounded-t",placeholder:"Point title..."}),e.jsx("button",{onClick:()=>J(T,D),className:"p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all no-print flex-shrink-0",title:"Delete entire point",children:e.jsx(ar,{size:14})})]}):e.jsx("span",{children:de.title})]}),e.jsx("ul",{className:"list-disc pl-8 space-y-1 text-xs",children:(de.bullets||[]).map((ce,Y)=>e.jsx("li",{children:z?e.jsxs("div",{className:"flex items-start gap-2 w-full",children:[e.jsx("textarea",{value:ce,onChange:te=>ve(T,D,"bullet",[Y,te.target.value]),className:"w-full border border-gray-300 rounded p-1.5 text-xs font-serif outline-none focus:border-emerald-500 bg-amber-50/20",rows:2,placeholder:"Bullet detail note..."}),e.jsx("button",{onClick:()=>he(T,D,Y),className:"p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all no-print flex-shrink-0 mt-1",title:"Delete bullet point",children:e.jsx(ar,{size:12})})]}):e.jsx("span",{children:ce})},Y))}),z&&e.jsx("div",{className:"pl-8 pt-1 no-print",children:e.jsxs("button",{onClick:()=>ut(T,D),className:"text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-emerald-50",children:[e.jsx(rr,{size:11}),e.jsx("span",{children:"Add Bullet"})]})})]},D))})]})};return e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"bg-white rounded-2xl shadow-md border border-gray-150 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 no-print",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl shadow-sm",children:e.jsx(aa,{size:22,className:U?"animate-spin":""})}),e.jsxs("div",{children:[e.jsx("h3",{className:"text-base font-extrabold text-gray-800",children:"Automated SWOT Analysis"}),e.jsxs("p",{className:"text-xs text-gray-500 font-semibold mt-0.5",children:["Course-Oriented SWOT Report for ",$," - ",v,"."]})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap sm:flex-nowrap",children:[e.jsxs("button",{onClick:()=>be(!z),className:`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${z?"bg-amber-500 text-white border-amber-600 shadow-md":"bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"}`,children:[z?e.jsx(Cr,{size:14}):e.jsx(_r,{size:14}),e.jsx("span",{children:z?"Done Editing":"Edit Report"})]}),e.jsxs("button",{onClick:S,disabled:U,className:"flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold border transition-all disabled:opacity-50",title:"Regenerate & AI-polish report (incorporates teacher custom notes)",children:[e.jsx(Mr,{size:14,className:U?"animate-spin":""}),e.jsx("span",{children:"Regenerate"})]}),e.jsxs("button",{onClick:it,className:"flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold shadow-md transition-all",children:[e.jsx(hr,{size:14}),e.jsx("span",{children:"Print / PDF"})]}),e.jsxs("button",{onClick:ne,className:"flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all",children:[e.jsx(Ue,{size:14}),e.jsx("span",{children:"Export Word"})]})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-12 max-w-4xl mx-auto printable-swot-document",style:{fontFamily:"'Times New Roman', Times, serif"},children:[e.jsxs("div",{className:"text-center space-y-1 mb-8",children:[e.jsx("div",{className:"flex justify-center mb-2",children:e.jsx("img",{src:ir,alt:"BAIUST Logo",className:"h-16 w-auto object-contain"})}),e.jsx("div",{className:"text-base sm:text-lg font-extrabold text-black leading-tight",children:"বাংলাদেশ আর্মি ইন্টারন্যাশনাল ইউনিভার্সিটি অব সায়েন্স এন্ড টেকনোলজি, কুমিল্লা"}),e.jsx("div",{className:"text-xs sm:text-sm font-bold text-black tracking-tight",children:"BANGLADESH ARMY INTERNATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (BAIUST), CUMILLA"}),e.jsx("div",{className:"text-xs font-bold text-black",children:"Department of Computer Science and Engineering"}),e.jsx("div",{className:"text-xs font-bold text-black mt-1",children:We}),e.jsxs("div",{className:"text-xs font-bold text-black",children:["Course Code: ",$]}),e.jsxs("div",{className:"text-xs font-bold text-black",children:["Course Title: ",v]}),e.jsx("div",{className:"text-sm font-black text-black tracking-wider uppercase mt-4 underline",children:"SWOT Analysis"})]}),U?e.jsxs("div",{className:"py-10 space-y-6 font-sans no-print",children:[e.jsxs("div",{className:"flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm",children:[e.jsx(Tr,{size:16,className:"animate-spin"}),e.jsxs("span",{children:["Generating & Polishing AI SWOT Report for ",$,"..."]})]}),e.jsxs("div",{className:"space-y-4 max-w-2xl mx-auto opacity-70",children:[e.jsx("div",{className:"h-4 bg-emerald-100 rounded w-1/3 animate-pulse"}),e.jsx("div",{className:"h-3 bg-gray-150 rounded w-full animate-pulse"}),e.jsx("div",{className:"h-3 bg-gray-150 rounded w-5/6 animate-pulse"}),e.jsx("div",{className:"h-4 bg-emerald-100 rounded w-1/4 animate-pulse pt-3"}),e.jsx("div",{className:"h-3 bg-gray-150 rounded w-11/12 animate-pulse"}),e.jsx("div",{className:"h-3 bg-gray-150 rounded w-4/5 animate-pulse"})]})]}):e.jsxs("div",{className:"space-y-6 text-sm text-black leading-relaxed",children:[H("strengths","Strengths",1),H("weaknesses","Weaknesses",2),H("opportunities","Opportunities",3),H("recommendations","Recommendations",4),H("threats","Threats",5),e.jsxs("div",{className:"pt-2",children:[e.jsx("h4",{className:"text-base font-extrabold text-black mb-1",children:"Conclusion"}),z?e.jsx("textarea",{value:se.conclusion,onChange:T=>F(T.target.value),className:"w-full border rounded p-2 text-xs font-serif outline-none leading-relaxed bg-amber-50/20 focus:border-emerald-500",rows:4,placeholder:"Conclusion paragraph..."}):e.jsx("p",{className:"text-xs text-justify font-normal leading-relaxed",children:se.conclusion})]})]})]})]})},Ne={primary:"#1a5f3f",secondary:"#d4af37",accent:"#2c5282",lightGreen:"#48bb78",lightGold:"#f6e05e",lightBlue:"#4299e1"},Ce=[Ne.primary,Ne.secondary,Ne.accent,Ne.lightGreen,Ne.lightGold,Ne.lightBlue,"#4f46e5","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"],Ge=a=>a>=80?{grade:"A+",gp:4,desc:"Outstanding"}:a>=75?{grade:"A",gp:3.75,desc:"Excellent"}:a>=70?{grade:"A-",gp:3.5,desc:"Very Good"}:a>=65?{grade:"B+",gp:3.25,desc:"Good"}:a>=60?{grade:"B",gp:3,desc:"Satisfactory"}:a>=55?{grade:"B-",gp:2.75,desc:"Above Average"}:a>=50?{grade:"C+",gp:2.5,desc:"Average"}:a>=45?{grade:"C",gp:2.25,desc:"Below Average"}:a>=40?{grade:"D",gp:2,desc:"Pass"}:{grade:"F",gp:0,desc:"Fail"},Ct=(a,n,o)=>!a||a.length===0?"N/A":(n==null?void 0:n.toLowerCase())==="attendance"&&o?`${a.length} ${a.length===1?"Student":"Students"}`:a.length>3?a[0]:a.join(", "),Ma=({students:a=[],marks:n={},assessments:o=null,coMapping:i=null,courseInfo:r={},targetPassMarks:m=40,kpiCO:l=50,kpiPO:h=50,metadataMap:y={},initialViewMode:f="overview",dbCourseOutcomes:R=[],dbProgramOutcomes:P=[],reportScope:M="section",onReportScopeChange:Z=null})=>{var E,j,xe,je,Pe,De,Xe,Ze,Ht,It,Yt;const[v,$]=K.useState(""),[O,re]=K.useState([]),[k,le]=K.useState(f),[G,L]=K.useState(""),[z,be]=K.useState({}),[U,ue]=K.useState({}),[X,fe]=K.useState(0);W.useEffect(()=>{const t=setTimeout(()=>{fe(s=>s+1)},70);return()=>clearTimeout(t)},[k]),W.useEffect(()=>{async function t(){try{const s=r._id||r.id;if(s){const b=await nr.getCourseCOs(s),p={};b.forEach(u=>{p[u.code]=u.description}),be(p)}const c=await nr.getProgramOutcomes(),d={};c.forEach(b=>{d[b.code]=b.description}),ue(d)}catch(s){console.error("Error loading outcome descriptions:",s)}}t()},[r]);const se=t=>z[t]?z[t]:{CO1:"Knowledge of AI concepts, search techniques, and agent architectures.",CO2:"Problem solving and reasoning using logic, knowledge representation, and planning.",CO3:"AI tools and applications including machine learning, NLP, and neural networks.",CO4:"Design and evaluation of intelligent systems for real-world scenarios.",CO5:"Ethics, society, and implications of artificial intelligence technologies.",CO6:"Lifelong learning and research directions in emerging AI paradigms."}[t]||`Course Outcome ${t} - Detailed analysis and competency evaluation.`,ye=t=>U[t]?U[t]:{PO1:"Engineering knowledge: Apply knowledge of mathematics, science, and engineering.",PO2:"Problem analysis: Identify, formulate, and analyze complex engineering problems.",PO3:"Design/development of solutions: Design solutions for complex engineering problems.",PO4:"Investigation: Conduct investigations of complex problems using research-based knowledge.",PO5:"Modern tool usage: Create, select, and apply appropriate techniques and resources.",PO6:"The engineer and society: Apply reasoning informed by contextual knowledge.",PO7:"Environment and sustainability: Understand the impact of professional engineering solutions.",PO8:"Ethics: Apply ethical principles and commit to professional ethics and responsibilities.",PO9:"Individual and team work: Function effectively as an individual and as a member or leader.",PO10:"Communication: Communicate effectively on complex engineering activities.",PO11:"Project management: Demonstrate knowledge and understanding of engineering principles.",PO12:"Lifelong learning: Recognize the need for and have the preparation to engage in lifelong learning."}[t]||`Program Outcome ${t} - Engineering graduate attribute alignment.`;if(!o||!i||a.length===0)return e.jsx("div",{className:"max-w-4xl mx-auto",children:e.jsxs("div",{className:"bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 text-center border-2 border-red-200",children:[e.jsxs("h2",{className:"text-2xl font-bold text-red-700 mb-4 flex items-center justify-center gap-2",children:[e.jsx(sr,{className:"w-8 h-8"}),"Incomplete Configuration"]}),e.jsx("p",{className:"text-gray-600 font-semibold mb-2",children:"Please complete all previous steps (Course Info, CO-PO Mapping, Assessments, and Marks Entry) before viewing reports."}),e.jsx("p",{className:"text-xs text-gray-400",children:"Make sure that student scores are entered and saved for the calculations to run correctly."})]})});const S=K.useMemo(()=>{const t=Er(a,n,o,i,m,l,h,y);return console.log("DEBUG Calculations Input:",{students:a,marks:n,assessments:o,targetPassMarks:m,kpiCO:l,kpiPO:h,metadataMap:y}),console.log("DEBUG Calculations Result:",t),t},[a,n,o,i,m,l,h,y]),ve=K.useMemo(()=>Rr(o,y),[o,y]),C=K.useMemo(()=>{if(R&&R.length>0)return R.map(s=>s.code.replace(/\s+/g,"").toUpperCase());const t=Object.keys(z);return t.length>0?t.map(s=>s.replace(/\s+/g,"").toUpperCase()):Array.from({length:12},(s,c)=>`CO${c+1}`).filter(s=>(ve[s]||0)>0)},[R,z,ve]),J=K.useMemo(()=>Array.from({length:12},(t,s)=>`PO${s+1}`).filter(t=>C.some(s=>{var c,d;return((c=i==null?void 0:i[s])==null?void 0:c[t])===1||((d=i==null?void 0:i[s])==null?void 0:d[t])==="1"})),[C,i]),ut=K.useMemo(()=>{const t={};return J.forEach(s=>{let c=0;C.forEach(d=>{var b,p;(((b=i==null?void 0:i[d])==null?void 0:b[s])===1||((p=i==null?void 0:i[d])==null?void 0:p[s])==="1")&&(c+=ve[d]||0)}),t[s]=c}),t},[J,C,i,ve]),he=K.useMemo(()=>{const t=[];return o.cts&&o.cts.forEach(s=>t.push({...s,type:"cts"})),o.presentation&&t.push({...o.presentation,name:"Presentation",type:"presentation"}),o.participation&&t.push({...o.participation,name:"Class Participation",type:"participation"}),o.projectReport&&t.push({...o.projectReport,name:"Project Report",type:"projectReport"}),o.assignments&&o.assignments.forEach(s=>t.push({...s,type:"assignments"})),o.attendance&&t.push({...o.attendance,name:"Attendance",type:"attendance"}),o.performance&&t.push({...o.performance,name:"Performance",type:"performance"}),o.midTerm&&o.midTerm.forEach(s=>t.push({...s,type:"midTerm"})),o.final&&o.final.forEach(s=>t.push({...s,type:"final"})),t},[o]),F=K.useMemo(()=>he.reduce((t,s)=>t+(parseFloat(s.maxMarks)||0),0),[he]),it=(t,s)=>{var u,A,g;const c=s._id?s._id.toString():"",d=t._id?t._id.toString():"",b=t.id;let p=null;if(d&&((u=n[d])!=null&&u[c]))p=n[d][c];else if((A=n[b])!=null&&A[c])p=n[b][c];else{const x=`${s.type}_${s.name}`;return((g=n[b])==null?void 0:g[x])??0}return p?p.totalMark??p.marks??0:0},ne=K.useMemo(()=>{const t={};return a.forEach(s=>{let c=0;he.forEach(d=>{c+=parseFloat(it(s,d)||0)}),t[s.id]=c}),t},[a,he,n]),We=K.useMemo(()=>{const t=a.map(d=>{const b=ne[d.id]||0,p=F>0?b/F*100:0;return{id:d.id,percentage:p}}).sort((d,b)=>b.percentage-d.percentage),s={};let c=1;for(let d=0;d<t.length;d++)d>0&&t[d].percentage<t[d-1].percentage&&(c=d+1),s[t[d].id]=c;return s},[a,ne,F]),H=K.useMemo(()=>{if(a.length===0)return{};let t=0,s=-1,c=null,d=999,b=null,p=0,u=0;return a.forEach(A=>{const g=ne[A.id]||0,x=F>0?g/F*100:0;t+=x;const{gp:w}=Ge(x);u+=w,x>=m&&p++,x>s&&(s=x,c=A),x<d&&(d=x,b=A)}),{enrollment:a.length,averagePercentage:t/a.length,averageGPA:u/a.length,highest:c?{id:c.id,name:c.name,percentage:s}:null,lowest:b?{id:b.id,name:b.name,percentage:d}:null,passRate:p/a.length*100}},[a,ne,F,m]),T=K.useMemo(()=>{const t={"A+":0,A:0,"A-":0,"B+":0,B:0,"B-":0,"C+":0,C:0,D:0,F:0};return a.forEach(s=>{const c=ne[s.id]||0,d=F>0?c/F*100:0,{grade:b}=Ge(d);t[b]!==void 0&&t[b]++}),Object.keys(t).map(s=>({name:s,Count:t[s]}))},[a,ne,F]),N=K.useMemo(()=>{const t={"Class Tests":0,"Mid Term":0,"Term Final":0,Assignments:0,Other:0};return he.forEach(s=>{const c=parseFloat(s.maxMarks)||0;s.type==="cts"?t["Class Tests"]+=c:s.type==="midTerm"?t["Mid Term"]+=c:s.type==="final"?t["Term Final"]+=c:s.type==="assignments"?t.Assignments+=c:t.Other+=c}),Object.keys(t).map(s=>({name:s,value:t[s]})).filter(s=>s.value>0)},[he]);K.useMemo(()=>a.map(t=>{const s=ne[t.id]||0,c=F>0?s/F*100:0,{grade:d,gp:b}=Ge(c);return{id:t.id,name:t.name,obtained:s,percentage:c,grade:d,gp:b,rank:We[t.id]}}).sort((t,s)=>s.percentage-t.percentage).slice(0,3),[a,ne,F,We]),K.useMemo(()=>a.map(t=>{const s=ne[t.id]||0,c=F>0?s/F*100:0,{grade:d,gp:b}=Ge(c),p=[];return C.forEach(u=>{var g;const A=((g=S.studentCOs[t.id])==null?void 0:g[u])||0;A<l&&p.push({co:u,score:A})}),{id:t.id,name:t.name,obtained:s,percentage:c,grade:d,gp:b,weakCOs:p}}).filter(t=>t.percentage<l||t.weakCOs.length>0).sort((t,s)=>t.percentage-s.percentage),[a,ne,F,S.studentCOs,C,l]);const B=K.useMemo(()=>C.filter(t=>{var s;return(((s=S.coAttainment[t])==null?void 0:s.kpiPercentage)||0)>=l}).length,[C,S.coAttainment,l]),ee=K.useMemo(()=>J.filter(t=>{var s;return(((s=S.poAttainment[t])==null?void 0:s.kpiPercentage)||0)>=h}).length,[J,S.poAttainment,h]),de=K.useMemo(()=>he.map(t=>{var V;const s=a.map(I=>it(I,t)),c=parseFloat(t.maxMarks)||0,d=s.length,b=d>0?s.reduce((I,Q)=>I+Q,0)/d:0,p=d>0?Math.max(...s):0,u=d>0?Math.min(...s):0,A=d>0?a.filter(I=>it(I,t)===p).map(I=>I.name):[],g=d>0?a.filter(I=>it(I,t)===u).map(I=>I.name):[],x=Ct(A,t.name,!0),w=Ct(g,t.name,!1);return{id:((V=t._id)==null?void 0:V.toString())||t.name,name:t.name,maxMarks:c,average:b,highest:p,lowest:u,highestScorers:x,lowestScorers:w}}),[he,a,n]),D=K.useMemo(()=>{const t=Object.values(ne),s=t.length,c=s>0?t.reduce((x,w)=>x+w,0)/s:0,d=s>0?Math.max(...t):0,b=s>0?Math.min(...t):0,p=s>0?a.filter(x=>ne[x.id]===d).map(x=>x.name):[],u=s>0?a.filter(x=>ne[x.id]===b).map(x=>x.name):[],A=Ct(p,"Total Course Mark",!0),g=Ct(u,"Total Course Mark",!1);return{maxMarks:F,average:c,highest:d,lowest:b,highestScorers:A,lowestScorers:g}},[a,ne,F]),ce=K.useMemo(()=>{const t={"90-100":0,"80-89":0,"70-79":0,"60-69":0,"50-59":0,"40-49":0,"<40":0};return a.forEach(s=>{const c=ne[s.id]||0,d=F>0?c/F*100:0;d>=90?t["90-100"]++:d>=80?t["80-89"]++:d>=70?t["70-79"]++:d>=60?t["60-69"]++:d>=50?t["50-59"]++:d>=40?t["40-49"]++:t["<40"]++}),Object.keys(t).map(s=>({name:s,"No. of Students":t[s]}))},[a,ne,F]),Y=K.useMemo(()=>{const t=[];return he.filter(p=>p.type==="cts").forEach(p=>{var u;t.push({id:((u=p._id)==null?void 0:u.toString())||`cts_${p.name}`,name:p.name,parent:"CT",assessment:p,isQuestion:!1,co:p.co,maxMarks:parseFloat(p.maxMarks)||0})}),he.filter(p=>["assignments","presentation","attendance","performance","participation","projectReport"].includes(p.type)).forEach(p=>{var u;t.push({id:((u=p._id)==null?void 0:u.toString())||`${p.type}_${p.name}`,name:p.name==="Presentation"?"Present.":p.name==="Assignment"?"Assign.":p.name==="Class Participation"?"Class Part.":p.name==="Project Report"?"Proj. Report":p.name,parent:"Others",assessment:p,isQuestion:!1,co:p.co,maxMarks:parseFloat(p.maxMarks)||0})}),he.filter(p=>p.type==="midTerm").forEach(p=>{var A,g;const u=y[(A=p._id)==null?void 0:A.toString()];u&&u.length>0?u.forEach(x=>{const w=(x.questionNumber||"").toString().startsWith("Q")?x.questionNumber:`Q${x.questionNumber}`;t.push({id:`${p._id}_q_${x.questionNumber}`,name:w,parent:"Mid Term",assessment:p,isQuestion:!0,questionNumber:x.questionNumber,co:x.co,maxMarks:parseFloat(x.maxMarks)||0})}):t.push({id:((g=p._id)==null?void 0:g.toString())||`mid_${p.name}`,name:p.name,parent:"Mid Term",assessment:p,isQuestion:!1,co:p.co,maxMarks:parseFloat(p.maxMarks)||0})}),he.filter(p=>p.type==="final").forEach(p=>{var A,g;const u=y[(A=p._id)==null?void 0:A.toString()];u&&u.length>0?u.forEach(x=>{const w=(x.questionNumber||"").toString().startsWith("Q")?x.questionNumber:`Q${x.questionNumber}`;t.push({id:`${p._id}_q_${x.questionNumber}`,name:w,parent:"Term Final",assessment:p,isQuestion:!0,questionNumber:x.questionNumber,co:x.co,maxMarks:parseFloat(x.maxMarks)||0})}):t.push({id:((g=p._id)==null?void 0:g.toString())||`final_${p.name}`,name:p.name,parent:"Term Final",assessment:p,isQuestion:!1,co:p.co,maxMarks:parseFloat(p.maxMarks)||0})}),t},[he,y]),te=K.useMemo(()=>{const t={CT:0,Others:0,"Mid Term":0,"Term Final":0};return Y.forEach(s=>{t[s.parent]!==void 0&&t[s.parent]++}),t},[Y]),q=(t,s)=>{var A,g,x,w;const c=s.assessment,d=c._id?c._id.toString():"",b=t._id?t._id.toString():"",p=t.id;let u=null;if(b&&((A=n[b])!=null&&A[d]))u=n[b][d];else if((g=n[p])!=null&&g[d])u=n[p][d];else{if(!s.isQuestion){const V=`${c.type}_${c.name}`;return((x=n[p])==null?void 0:x[V])??0}return 0}return u?s.isQuestion?parseFloat(((w=u.questionMarks)==null?void 0:w[s.questionNumber])??0)||0:parseFloat(u.totalMark??u.marks??0)||0:0},ge=K.useMemo(()=>a.map(t=>{const s=ne[t.id]||0,c=F>0?s/F*100:0,{grade:d,gp:b}=Ge(c);return{id:t.id,name:t.name,obtained:s,percentage:c,grade:d,gp:b,rank:We[t.id]}}).sort((t,s)=>s.percentage-t.percentage).slice(0,10),[a,ne,F,We]),pe=K.useMemo(()=>a.map(t=>{const s=ne[t.id]||0,c=F>0?s/F*100:0,d=[];return C.forEach(b=>{var u;(((u=S.studentCOs[t.id])==null?void 0:u[b])||0)<l&&d.push(b)}),{id:t.id,name:t.name,obtained:s,percentage:c,weakCOs:d}}).filter(t=>t.percentage<l||t.weakCOs.length>0).sort((t,s)=>t.percentage-s.percentage).slice(0,10),[a,ne,F,S.studentCOs,C,l]),Je=t=>{const s=he.filter(u=>{const A=u._id?u._id.toString():"",g=y[A];return g&&g.length>0?g.some(x=>(x.co||"").replace(/\s+/g,"").toUpperCase()===t):(u.co||"").replace(/\s+/g,"").toUpperCase()===t});if(s.length===0)return{assessmentsText:"No specific assessments mapped directly.",strategy:"Incorporate basic reviews or extra practice exercises mapped to this CO.",advice:"Create dedicated reading materials or mini-quizzes to assess conceptual gaps."};const c=s.map(u=>`${u.name} (${u.type==="cts"?"CT":u.type==="midTerm"?"Mid":u.type==="final"?"Final":"Assg"})`).join(", "),d=new Set(s.map(u=>u.type));let b="",p="";return d.has("final")||d.has("midTerm")?(b="Conduct review workshops focusing on term-exam question styles and core concepts.",p="Clarify key theories and structures of final/midterm questions."):d.has("cts")?(b="Deploy short recap quizzes, worksheets, or in-class interactive discussions.",p="Identify specific misconceptions using quick-response feedback tasks."):d.has("assignments")?(b="Provide structured tutorial files, sample solutions, or guided office hours.",p="Encourage hands-on problem practice and guide students through step-by-step solutions."):(b="Arrange additional lab session reviews, practical examples, or peer demonstrations.",p="Provide structured self-check matrices and constructive peer-review worksheets."),{assessmentsText:c,strategy:b,advice:p}},me=()=>{var u,A,g,x,w,V,I;const t=wt.book_new(),s=[["COURSE INFORMATION"],["Course Code",(r==null?void 0:r.courseCode)||"N/A"],["Course Title",(r==null?void 0:r.courseTitle)||"N/A"],...r!=null&&r.batchName?[["Batch Name",r.batchName]]:[],...r!=null&&r.semesterName?[["Semester",r.semesterName]]:[],...r!=null&&r.sectionName?[["Section",r.sectionName]]:[],["Generated on",(()=>{const Q=new Date;return Q.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+", "+Q.getFullYear()})()],[],["Calculations of COs & POs"],[],["Student ID","Student Name",...C,...J,"Total Obtained","Overall %","Grade"],...a.map(Q=>{const ie=ne[Q.id]||0,yt=F>0?ie/F*100:0,{grade:$t}=Ge(yt);return[Q.id,Q.name,...C.map(lt=>{var Qe;return(((Qe=S.studentCOs[Q.id])==null?void 0:Qe[lt])||0).toFixed(1)}),...J.map(lt=>{var mt;const Qe=((mt=S.studentPOs[Q.id])==null?void 0:mt[lt])||0;return Qe>0?Qe.toFixed(1):"0.0"}),ie.toFixed(1),`${yt.toFixed(1)}%`,$t]})],c=wt.aoa_to_sheet(s);c["!cols"]=[{wch:15},{wch:25},...Array(C.length+J.length).fill({wch:8}),{wch:15},{wch:12},{wch:8}],wt.book_append_sheet(t,c,"COs & POs Calculations");const d=[[`OBE ${M==="combined"?"BATCH":"SECTION"} ATTAINMENT SUMMARY REPORT`],[],["COURSE DETAILS"],["Course Code",(r==null?void 0:r.courseCode)||"N/A"],["Course Title",(r==null?void 0:r.courseTitle)||"N/A"],["Teacher Name",(r==null?void 0:r.teacherName)||"N/A"],["Generated on",(()=>{const Q=new Date;return Q.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+", "+Q.getFullYear()})()],[],["SUMMARY METRICS"],["Total Enrollment",H.enrollment],["Class Average %",`${(u=H.averagePercentage)==null?void 0:u.toFixed(1)}%`],["Class Average GPA",(A=H.averageGPA)==null?void 0:A.toFixed(2)],["Pass Rate",`${(g=H.passRate)==null?void 0:g.toFixed(1)}%`],["Highest Score",`${(x=H.highest)==null?void 0:x.percentage.toFixed(1)}% (${(w=H.highest)==null?void 0:w.id})`],["Lowest Score",`${(V=H.lowest)==null?void 0:V.percentage.toFixed(1)}% (${(I=H.lowest)==null?void 0:I.id})`],[],["CO ATTAINMENT SUMMARY"],["CO",`% Above Pass Marks (${m}%)`,`% Above KPI (${l}%)`],...C.map(Q=>{const ie=S.coAttainment[Q];return[Q,((ie==null?void 0:ie.passMarksPercentage)||0).toFixed(1),((ie==null?void 0:ie.kpiPercentage)||0).toFixed(1)]}),[],["PO ATTAINMENT SUMMARY"],["PO",`% Above Pass Marks (${m}%)`,`% Above KPI (${h}%)`],...J.map(Q=>{const ie=S.poAttainment[Q];return[Q,((ie==null?void 0:ie.passMarksPercentage)||0).toFixed(1),((ie==null?void 0:ie.kpiPercentage)||0).toFixed(1)]})],b=wt.aoa_to_sheet(d);b["!cols"]=[{wch:30},{wch:30},{wch:25}],wt.book_append_sheet(t,b,"Summary Report");const p=`OBE_${M==="combined"?"Batch":"Section"}_Report_${(r==null?void 0:r.courseCode)||"Course"}_${new Date().toISOString().split("T")[0]}.xlsx`;Kr(t,p)},Te=async t=>{const s=document.getElementById(t);if(!s)return"";try{return(await Wr(s,{backgroundColor:"#ffffff",scale:1.5,logging:!1,useCORS:!0})).toDataURL("image/png")}catch(c){return console.error("Error capturing chart image:",t,c),""}},ot=(t,s)=>`
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${t}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333333; }
          .cover-page { border: 6px double #1a5f3f; padding: 40px; text-align: center; margin-bottom: 30px; }
          .university { font-size: 18pt; font-weight: bold; color: #1a5f3f; margin-bottom: 5px; }
          .department { font-size: 11pt; font-weight: bold; color: #666666; text-transform: uppercase; margin-bottom: 25px; }
          .report-title { font-size: 22pt; font-weight: 800; color: #1a5f3f; margin-bottom: 10px; text-transform: uppercase; }
          .details-table { width: 80%; margin: 30px auto; border-top: 2px solid #1a5f3f; border-bottom: 2px solid #1a5f3f; }
          .details-table td { border: none; padding: 6px; text-align: left; font-size: 10pt; }
          .details-table td.label { font-weight: bold; color: #1a5f3f; width: 35%; }
          .section-title { font-size: 14pt; font-bold: true; color: #1a5f3f; border-bottom: 2px solid #1a5f3f; padding-bottom: 4px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
          .summary-grid { width: 100%; margin-bottom: 20px; }
          .summary-card { background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
          .summary-label { font-size: 8pt; font-weight: bold; color: #666666; text-transform: uppercase; }
          .summary-val { font-size: 14pt; font-weight: bold; color: #1a5f3f; margin-top: 5px; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
          table.data-table th { background-color: #1a5f3f; color: #ffffff; font-weight: bold; border: 1px solid #999999; padding: 6px; text-align: center; }
          table.data-table td { border: 1px solid #cccccc; padding: 6px; text-align: center; }
          table.data-table td.text-left { text-align: left; }
          .page-break { page-break-before: always; }
          .chart-box { text-align: center; margin: 25px 0; }
          .chart-img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; }
          .badge-green { color: #1a5f3f; font-weight: bold; }
          .badge-red { color: #c53030; font-weight: bold; }
          .badge-yellow { color: #b7791f; font-weight: bold; }
        </style>
      </head>
      <body>
        ${s}
      </body>
      </html>
    `,qe=async t=>{const s=a.find(ae=>ae.id===t);if(!s)return;const c=ne[t]||0,d=F>0?c/F*100:0,{grade:b,gp:p,desc:u}=Ge(d),A=d>=m?"Pass":"Below Pass",g=We[t]||0,x=await Te(`student-co-bar-${t}`),w=await Te(`student-po-bar-${t}`);let V="";he.forEach(ae=>{const we=it(s,ae),Ee=parseFloat(ae.maxMarks)||0,ke=Ee>0?we/Ee*100:0,vt=ke>=m?"Pass":"Below Pass";V+=`
        <tr>
          <td class="text-left font-bold" style="text-transform: capitalize;">${ae.type==="cts"?"Class Test":ae.type==="midTerm"?"Mid Term":ae.type==="final"?"Term Final":"Assignment"}</td>
          <td class="text-left">${ae.name}</td>
          <td>${ae.co||"N/A"}</td>
          <td>${Ee}</td>
          <td class="font-bold">${we}</td>
          <td>${ke.toFixed(1)}%</td>
          <td class="${vt==="Pass"?"badge-green":"badge-red"}">${vt}</td>
        </tr>
      `});let I="";C.forEach(ae=>{var ke;const we=((ke=S.studentCOs[t])==null?void 0:ke[ae])||0,Ee=we>=l?"Met":"Below KPI";I+=`
        <tr>
          <td class="font-bold">${ae}</td>
          <td>${ve[ae]||0}</td>
          <td class="font-bold">${we.toFixed(1)}%</td>
          <td class="${we>=l?"badge-green":"badge-red"}">${Ee}</td>
        </tr>
      `});let Q="";J.forEach(ae=>{var ke;const we=((ke=S.studentPOs[t])==null?void 0:ke[ae])||0,Ee=we>=h?"Met":"Below KPI";Q+=`
        <tr>
          <td class="font-bold">${ae}</td>
          <td class="font-bold">${we.toFixed(1)}%</td>
          <td class="${we>=h?"badge-green":"badge-red"}">${Ee}</td>
        </tr>
      `});let ie="";C.forEach(ae=>{var Ee;const we=((Ee=S.studentCOs[t])==null?void 0:Ee[ae])||0;if(we<l){const ke=Je(ae);ie+=`
          <tr>
            <td class="font-bold">${ae}</td>
            <td>${we.toFixed(1)}%</td>
            <td class="text-left">${ke.assessmentsText}</td>
            <td class="text-left">${ke.strategy}</td>
            <td class="text-left">${ke.advice}</td>
          </tr>
        `}}),ie||(ie=`
        <tr>
          <td colspan="5" style="text-align: center; color: #1a5f3f; font-weight: bold; padding: 12px;">
            Outstanding! Student has met the KPI targets for all course outcomes. No remediation action required.
          </td>
        </tr>
      `);const $t=`
      ${`
      <div class="cover-page">
        <div class="university">Bangladesh Army International University of Science & Technology</div>
        <div class="department">Department of Computer Science and Engineering</div>
        <div style="height: 15px;"></div>
        <div class="report-title">Individual Outcome Report</div>
        <div style="font-size: 12pt; font-weight: bold; color: #666;">STUDENT PERFORMANCE & OUTCOME ATTAINMENT ANALYSIS</div>
        <div style="height: 25px;"></div>
        <table class="details-table">
          <tr>
            <td class="label">Course Code & Title</td>
            <td>${r.courseCode||"N/A"} - ${r.courseTitle||"N/A"}</td>
          </tr>
          <tr>
            <td class="label">Academic Session</td>
            <td>
              ${r.semesterName&&r.academicYear&&r.semesterName.includes(String(r.academicYear))?r.semesterName:`${r.semesterName||"N/A"}${r.academicYear?` (${r.academicYear})`:""}`}
            </td>
          </tr>
          <tr>
            <td class="label">Batch & Section</td>
            <td>${r.batchName||"N/A"} ${r.sectionName?`(Sec: ${r.sectionName})`:""}</td>
          </tr>
          <tr>
            <td class="label">Course Instructor</td>
            <td>${r.teacherName||"N/A"} (${r.teacherEmail||"N/A"})</td>
          </tr>
          <tr>
            <td class="label">Student Name</td>
            <td style="font-weight: bold; color: #1a5f3f;">${s.name}</td>
          </tr>
          <tr>
            <td class="label">Student ID / Roll</td>
            <td style="font-weight: bold; color: #1a5f3f;">${s.id}</td>
          </tr>
          <tr>
            <td class="label">Report Generated</td>
            <td>${(()=>{const ae=new Date;return ae.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+", "+ae.getFullYear()})()}</td>
          </tr>
        </table>
      </div>
      <div class="page-break"></div>
    `}
      <div class="section-title">1. Performance Summary</div>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Marks Obtained</div>
              <div class="summary-val">${c.toFixed(1)} / ${F}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Overall Percentage</div>
              <div class="summary-val">${d.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Grade & GPA</div>
              <div class="summary-val">${b} (${p.toFixed(2)})</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Class Rank</div>
              <div class="summary-val">Rank ${g} / ${a.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Pass/Fail Status</div>
              <div class="summary-val ${A==="Pass"?"badge-green":"badge-red"}">${A}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Remediation Status</div>
              <div class="summary-val ${ie.includes("Outstanding")?"badge-green":"badge-yellow"}">
                ${ie.includes("Outstanding")?"None Required":"Support Advised"}
              </div>
            </div>
          </td>
        </tr>
      </table>

      <div class="section-title">2. Detailed Assessment Sheet</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Assessment Title</th>
            <th>CO</th>
            <th>Max Marks</th>
            <th>Obtained</th>
            <th>Percentage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${V}
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">3. Course Outcome (CO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Outcome (CO)</th>
            <th>Allocated Marks</th>
            <th>Student Score</th>
            <th>KPI Target Met (>=${l}%)</th>
          </tr>
        </thead>
        <tbody>
          ${I}
        </tbody>
      </table>

      ${x?`
      <div class="chart-box">
        <p style="font-weight: bold; color: #1a5f3f; margin-bottom: 5px;">CO Attainment Chart</p>
        <img class="chart-img" src="${x}" alt="CO Chart" />
      </div>
      `:""}

      <div class="page-break"></div>

      <div class="section-title">4. Program Outcome (PO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Outcome (PO)</th>
            <th>Student Attainment</th>
            <th>KPI Target Met (>=${h}%)</th>
          </tr>
        </thead>
        <tbody>
          ${Q}
        </tbody>
      </table>

      ${w?`
      <div class="chart-box">
        <p style="font-weight: bold; color: #1a5f3f; margin-bottom: 5px;">PO Attainment Chart</p>
        <img class="chart-img" src="${w}" alt="PO Chart" />
      </div>
      `:""}

      <div class="page-break"></div>

      <div class="section-title">5. Targeted Improvement Action Plan</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Weak CO</th>
            <th>Attainment</th>
            <th>Mapped Components</th>
            <th>Suggested Reinforcement Strategy</th>
            <th>Pedagogical Remediation Advice</th>
          </tr>
        </thead>
        <tbody>
          ${ie}
        </tbody>
      </table>
    `,lt=ot(`OBE Individual Report - ${s.id}`,$t),Qe=new Blob(["\uFEFF"+lt],{type:"application/msword"}),mt=URL.createObjectURL(Qe),dt=document.createElement("a");dt.href=mt,dt.download=`OBE_Individual_Report_${s.id}_${r.courseCode||"Course"}.doc`,document.body.appendChild(dt),dt.click(),document.body.removeChild(dt)},ft=async()=>{var we,Ee,ke,vt,Vt,Jt,qt,Qt,Xt;const t=await Te("grade-dist-chart"),s=await Te("perf-dist-chart"),c=await Te("assess-weight-chart"),d=await Te("batch-co-chart"),b=await Te("batch-po-chart"),p=await Te("overall-perf-gauge");let u="";a.forEach((_,Re)=>{const ze=ne[_.id]||0,Ke=F>0?ze/F*100:0,{grade:$r,gp:Sr}=Ge(Ke),Pr=We[_.id];let Zt="";Y.forEach(jt=>{Zt+=`<td>${q(_,jt)}</td>`});let er="";C.forEach(jt=>{var Nt;const _t=((Nt=S.studentCOs[_.id])==null?void 0:Nt[jt])||0;er+=`<td style="font-weight: bold;">${_t.toFixed(1)}%</td>`});let tr="";J.forEach(jt=>{var Nt;const _t=((Nt=S.studentPOs[_.id])==null?void 0:Nt[jt])||0;tr+=`<td>${_t.toFixed(1)}%</td>`}),u+=`
        <tr>
          <td>${Re+1}</td>
          <td class="font-bold">${_.id}</td>
          <td class="text-left font-bold" style="white-space: nowrap;">${_.name}</td>
          ${Zt}
          <td class="font-bold">${ze.toFixed(1)}</td>
          <td class="font-bold">${Ke.toFixed(1)}%</td>
          <td class="font-bold">${$r}</td>
          <td>${Sr.toFixed(2)}</td>
          <td class="font-bold">${Pr}</td>
          ${er}
          ${tr}
        </tr>
      `});let A="";de.forEach(_=>{A+=`
        <tr>
          <td class="text-left font-bold">${_.name}</td>
          <td>${_.maxMarks}</td>
          <td class="font-bold">${_.average.toFixed(2)}</td>
          <td>${_.highest}</td>
          <td style="color: #1a5f3f; font-weight: normal;">${_.highestScorers}</td>
          <td>${_.lowest}</td>
          <td style="color: #9b2c2c; font-weight: normal;">${_.lowestScorers}</td>
        </tr>
      `});let g="";ge.forEach(_=>{g+=`
        <tr>
          <td class="font-bold">Rank ${_.rank}</td>
          <td class="font-bold">${_.id}</td>
          <td class="text-left">${_.name}</td>
          <td class="font-bold text-green">${_.percentage.toFixed(1)}%</td>
          <td class="font-bold">${_.grade}</td>
          <td>${_.gp.toFixed(2)}</td>
        </tr>
      `});let x="";pe.forEach(_=>{const Re=_.weakCOs.join(", ");x+=`
        <tr>
          <td class="font-bold">${_.id}</td>
          <td class="text-left">${_.name}</td>
          <td class="font-bold text-red">${_.percentage.toFixed(1)}%</td>
          <td class="text-left font-bold" style="color: #c53030;">${Re||"N/A"}</td>
        </tr>
      `}),pe.length===0&&(x=`
        <tr>
          <td colspan="4" style="text-align: center; color: #1a5f3f; font-weight: bold; padding: 12px;">
            All students are successfully above the KPI threshold.
          </td>
        </tr>
      `);let w="";C.forEach(_=>{const Re=S.coAttainment[_],ze=(Re==null?void 0:Re.kpiPercentage)||0;if(ze<l){const Ke=Je(_);w+=`
          <tr>
            <td class="font-bold">${_}</td>
            <td class="font-bold text-red">${ze.toFixed(1)}%</td>
            <td class="text-left">${Ke.strategy}</td>
            <td class="text-left">${Ke.advice}</td>
          </tr>
        `}}),w||(w=`
        <tr>
          <td colspan="4" style="text-align: center; color: #1a5f3f; font-weight: bold; padding: 12px;">
            All Course Outcomes met the KPI Target percentage class-wide! No remediation required.
          </td>
        </tr>
      `);let V="";C.forEach(_=>{var Ke;const Re=((Ke=S.coAttainment[_])==null?void 0:Ke.kpiPercentage)||0,ze=Re>=l;V+=`
        <tr>
          <td class="font-bold">${_}</td>
          <td class="font-bold">${Re.toFixed(1)}%</td>
          <td>${l}%</td>
          <td class="${ze?"badge-green":"badge-yellow"} font-bold">${ze?"KPI Met":"Below Target"}</td>
        </tr>
      `});let I="";J.forEach(_=>{var Ke;const Re=((Ke=S.poAttainment[_])==null?void 0:Ke.kpiPercentage)||0,ze=Re>=h;I+=`
        <tr>
          <td class="font-bold">${_}</td>
          <td class="font-bold">${Re.toFixed(1)}%</td>
          <td>${h}%</td>
          <td class="${ze?"badge-green":"badge-yellow"} font-bold">${ze?"KPI Met":"Below Target"}</td>
        </tr>
      `});const Q=Y.map(_=>`<th>${_.name}<br/><span style="font-size: 7.5pt; font-weight: normal;">(${_.co||""})</span></th>`).join(""),ie=C.map(_=>`<th>${_}</th>`).join(""),yt=J.map(_=>`<th>${_}</th>`).join(""),lt=`
      ${`
      <div class="cover-page">
        <div class="university">Bangladesh Army International University of Science & Technology</div>
        <div class="department">Department of Computer Science and Engineering</div>
        <div style="height: 25px;"></div>
        <div class="report-title">OBE COURSE REPORT</div>
        <div style="font-size: 13pt; font-weight: bold; color: #1a5f3f; text-transform: uppercase; letter-spacing: 1px;">COHORT PERFORMANCE & OBE ATTAINMENT ANALYSIS</div>
        <div style="height: 35px;"></div>
        <table class="details-table">
          <tr>
            <td class="label">Course Code & Title</td>
            <td>${r.courseCode||"N/A"} - ${r.courseTitle||"N/A"}</td>
          </tr>
          <tr>
            <td class="label">Academic Session</td>
            <td>
              ${r.semesterName&&r.academicYear&&r.semesterName.includes(String(r.academicYear))?r.semesterName:`${r.semesterName||"N/A"}${r.academicYear?` (${r.academicYear})`:""}`}
            </td>
          </tr>
          <tr>
            <td class="label">Batch & Section</td>
            <td>${r.batchName||"N/A"} ${r.sectionName?`(Sec: ${r.sectionName})`:""}</td>
          </tr>
          <tr>
            <td class="label">Course Instructor</td>
            <td>${r.teacherName||"N/A"} (${r.teacherEmail||"N/A"})</td>
          </tr>
          <tr>
            <td class="label">Total Enrollment</td>
            <td>${a.length} Students</td>
          </tr>
          <tr>
            <td class="label">Report Generated</td>
            <td>${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
      <div class="page-break"></div>
    `}
      
      <div class="section-title">2. Course Information</div>
      <table class="data-table text-left">
        <tr>
          <td class="font-bold" style="background-color: #f7fafc; width: 30%;">Course Code</td>
          <td>${r.courseCode||"N/A"}</td>
        </tr>
        <tr>
          <td class="font-bold" style="background-color: #f7fafc;">Course Title</td>
          <td>${r.courseTitle||"N/A"}</td>
        </tr>
        <tr>
          <td class="font-bold" style="background-color: #f7fafc;">Batch & Section</td>
          <td>${r.batchName||"N/A"} ${r.sectionName?`(Sec: ${r.sectionName})`:""}</td>
        </tr>
        <tr>
          <td class="font-bold" style="background-color: #f7fafc;">Instructor Name</td>
          <td>${r.teacherName||"N/A"}</td>
        </tr>
      </table>

      <div class="section-title">3. Quick Statistics</div>
      <table style="width: 100%; border: none;">
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Total Students</div>
              <div class="summary-val">${a.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Class Average %</div>
              <div class="summary-val">${(we=H.averagePercentage)==null?void 0:we.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Class Avg GPA</div>
              <div class="summary-val">${(Ee=H.averageGPA)==null?void 0:Ee.toFixed(2)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Pass Rate</div>
              <div class="summary-val text-green">${(ke=H.passRate)==null?void 0:ke.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Highest Percentage</div>
              <div class="summary-val">${(vt=H.highest)==null?void 0:vt.percentage.toFixed(1)}%</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Lowest Percentage</div>
              <div class="summary-val text-red">${(Vt=H.lowest)==null?void 0:Vt.percentage.toFixed(1)}%</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">COs Attained</div>
              <div class="summary-val">${B} / ${C.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">POs Attained</div>
              <div class="summary-val">${ee} / ${J.length}</div>
            </div>
          </td>
          <td style="width: 33%; border: none;">
            <div class="summary-card">
              <div class="summary-label">Overall pass mark</div>
              <div class="summary-val">${m}%</div>
            </div>
          </td>
        </tr>
      </table>

      <div class="page-break"></div>

      <div class="section-title">4. Assessment Summary</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Assessment Name</th>
            <th>Max Marks</th>
            <th>Class Average</th>
            <th>Highest Mark</th>
            <th>Highest Scorer</th>
            <th>Lowest Mark</th>
            <th>Lowest Scorer</th>
          </tr>
        </thead>
        <tbody>
          ${A}
          <tr style="background-color: #f7fafc; font-weight: bold;">
            <td>Total Course Mark</td>
            <td>${D.maxMarks}</td>
            <td>${D.average.toFixed(2)}</td>
            <td>${D.highest.toFixed(1)}</td>
            <td style="color: #1a5f3f; font-weight: normal;">${D.highestScorers}</td>
            <td>${D.lowest.toFixed(1)}</td>
            <td style="color: #9b2c2c; font-weight: normal;">${D.lowestScorers}</td>
          </tr>
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">5. Complete Student Mark Sheet</div>
      <table class="data-table" style="font-size: 7.5pt; table-layout: auto;">
        <thead>
          <tr style="background-color: #1a5f3f; color: #ffffff;">
            <th rowspan="2">No.</th>
            <th rowspan="2">ID</th>
            <th rowspan="2">Name</th>
            <th colspan="${Y.length}">Assessment Breakdown Marks</th>
            <th rowspan="2">Total Marks</th>
            <th rowspan="2">Percentage</th>
            <th rowspan="2">Grade</th>
            <th rowspan="2">GPA</th>
            <th rowspan="2">Rank</th>
            <th colspan="${C.length}">CO Attainment %</th>
            <th colspan="${J.length}">PO Attainment %</th>
          </tr>
          <tr style="background-color: #1a5f3f; color: #ffffff;">
            ${Q}
            ${ie}
            ${yt}
          </tr>
        </thead>
        <tbody>
          ${u}
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">6. Grade Distribution</div>
      ${t?`
      <div class="chart-box">
        <img class="chart-img" src="${t}" alt="Grade Distribution" />
      </div>
      `:'<p style="font-style: italic;">No chart data captured.</p>'}

      <div class="section-title">7. Performance Distribution</div>
      ${s?`
      <div class="chart-box">
        <img class="chart-img" src="${s}" alt="Performance Distribution" />
      </div>
      `:'<p style="font-style: italic;">No chart data captured.</p>'}

      <div class="section-title">8. Assessment Contribution</div>
      ${c?`
      <div class="chart-box">
        <img class="chart-img" src="${c}" alt="Assessment Contribution" />
      </div>
      `:'<p style="font-style: italic;">No chart data captured.</p>'}

      <div class="page-break"></div>

      <div class="section-title">9. Overall Performance (Gauge)</div>
      ${p?`
      <div class="chart-box">
        <img class="chart-img" src="${p}" alt="Overall Performance Gauge" style="max-width: 320px;" />
      </div>
      `:'<p style="font-style: italic;">No gauge captured.</p>'}

      <div class="section-title">10. Course Outcome (CO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Course Outcome</th>
            <th>Average Attainment %</th>
            <th>KPI Target %</th>
            <th>Attainment Status</th>
          </tr>
        </thead>
        <tbody>
          ${V}
        </tbody>
      </table>
      ${d?`
      <div class="chart-box">
        <img class="chart-img" src="${d}" alt="CO Attainment Chart" />
      </div>
      `:""}

      <div class="page-break"></div>

      <div class="section-title">11. Program Outcome (PO) Attainment</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Program Outcome</th>
            <th>Average Attainment %</th>
            <th>KPI Target %</th>
            <th>Attainment Status</th>
          </tr>
        </thead>
        <tbody>
          ${I}
        </tbody>
      </table>
      ${b?`
      <div class="chart-box">
        <img class="chart-img" src="${b}" alt="PO Attainment Chart" />
      </div>
      `:""}

      <div class="page-break"></div>

      <div class="section-title">12. Top 10 Students</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Overall Percentage</th>
            <th>Grade</th>
            <th>GPA</th>
          </tr>
        </thead>
        <tbody>
          ${g}
        </tbody>
      </table>

      <div class="section-title">13. Students Needing Improvement</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Overall Percentage</th>
            <th>Weak CO Deficit Outcomes</th>
          </tr>
        </thead>
        <tbody>
          ${x}
        </tbody>
      </table>

      <div class="page-break"></div>

      <div class="section-title">14. KPI Summary</div>
      <table class="data-table" style="width: 100%;">
        <tr style="background-color: #f7fafc;">
          <th style="width: 33%;">Pass Threshold</th>
          <th style="width: 33%;">CO KPI Target</th>
          <th style="width: 33%;">PO KPI Target</th>
        </tr>
        <tr>
          <td style="font-size: 14pt; font-weight: bold;">${m}%</td>
          <td style="font-size: 14pt; font-weight: bold; color: #1a5f3f;">${l}%</td>
          <td style="font-size: 14pt; font-weight: bold; color: #2c5282;">${h}%</td>
        </tr>
      </table>

      <div class="section-title">15. Automatic Observations</div>
      <ul style="line-height: 1.6; font-size: 10pt;">
        <li>Overall cohort size is <strong>${a.length} students</strong> with an average performance score of <strong>${(Jt=H.averagePercentage)==null?void 0:Jt.toFixed(2)}%</strong>.</li>
        <li>The class-wide overall pass rate achieved is <strong>${(qt=H.passRate)==null?void 0:qt.toFixed(2)}%</strong>.</li>
        <li>A total of <strong>${B} out of ${C.length} Course Outcomes</strong> successfully met their class attainment target (KPI: ${l}%).</li>
        <li>A total of <strong>${ee} out of ${J.length} Program Outcomes</strong> met the program mapping KPI threshold (KPI: ${h}%).</li>
        <li>The highest marks percentage scored by a student is <strong>${(Qt=H.highest)==null?void 0:Qt.percentage.toFixed(1)}%</strong>, whereas the lowest is <strong>${(Xt=H.lowest)==null?void 0:Xt.percentage.toFixed(1)}%</strong>.</li>
      </ul>

      <div class="section-title">16. Recommendations</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Deficit Outcome</th>
            <th>Class Attainment</th>
            <th>Suggested Pedagogical Strategy</th>
            <th>Syllabus Reinforcement Advice</th>
          </tr>
        </thead>
        <tbody>
          ${w}
        </tbody>
      </table>

      <div class="section-title">17. Teacher's Reflection</div>
      <div style="border: 1px solid #ccc; padding: 15px; background-color: #fcfcfc; min-height: 120px; font-style: italic;">
        ${G?G.replace(/\n/g,"<br/>"):"No reflection notes provided by the instructor."}
      </div>

      <div class="page-break"></div>

      <div class="section-title">18. Signature & Approvals</div>
      <div style="margin-top: 50px;">
        <table style="width: 100%; border: none; margin-top: 30px;">
          <tr>
            <td style="width: 45%; border: none; border-top: 1px solid #333; text-align: center; padding-top: 8px; font-weight: bold;">
              Course Instructor / Teacher Signature
            </td>
            <td style="width: 10%; border: none;"></td>
            <td style="width: 45%; border: none; border-top: 1px solid #333; text-align: center; padding-top: 8px; font-weight: bold;">
              Head of Department / Program Director Signature
            </td>
          </tr>
          <tr>
            <td style="border: none; text-align: center; font-size: 8pt; color: #777;">Date: ________________________</td>
            <td style="border: none;"></td>
            <td style="border: none; text-align: center; font-size: 8pt; color: #777;">Date: ________________________</td>
          </tr>
        </table>
      </div>
    `,Qe=ot(`OBE ${M==="combined"?"Batch":"Section"} Attainment Report`,lt),mt=new Blob(["\uFEFF"+Qe],{type:"application/msword"}),dt=URL.createObjectURL(mt),ae=document.createElement("a");ae.href=dt,ae.download=`OBE_${M==="combined"?"Batch":"Section"}_Report_${r.courseCode||"Course"}_${r.batchName||"Batch"}.doc`,document.body.appendChild(ae),ae.click(),document.body.removeChild(ae)};return e.jsxs("div",{className:"max-w-7xl mx-auto space-y-6",children:[e.jsx("style",{children:`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 12mm 12mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body, html {
            background-color: #f8fafc !important;
            color: #1e293b !important;
            font-family: 'Segoe UI', Arial, sans-serif !important;
            font-size: 11px !important;
          }
          nav, sidebar, header, .no-print, button, select, .tabs-container {
            display: none !important;
          }
          /* Reset container margins/padding and layouts outside reports */
          .profile-avatar-container, main > div > .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          div.max-w-7xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-report-container {
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          /* Preserve layout structures (grids) */
          .grid {
            display: grid !important;
          }
          .lg:grid-cols-5 {
            display: grid !important;
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          }
          .lg:col-span-3 {
            grid-column: span 3 / span 3 !important;
          }
          .lg:col-span-2 {
            grid-column: span 2 / span 2 !important;
          }
          .lg:grid-cols-12 {
            display: grid !important;
            grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
          }
          .lg:col-span-8 {
            grid-column: span 8 / span 8 !important;
          }
          .lg:col-span-4 {
            grid-column: span 4 / span 4 !important;
          }
          .lg:grid-cols-3 {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .lg:grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .md:grid-cols-5, .lg:grid-cols-9 {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            margin-bottom: 10px !important;
          }

          /* Clean cover page display on page 1 without page breaks */
          #batch-report-cover {
            display: block !important;
            margin-bottom: 20px !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Enforce standard cell padding & tables styling in print */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          th, td {
            font-size: 10px !important;
          }

          /* Scale charting vectors to fit inside standard printable bounds correctly */
          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
            max-height: 250px !important;
          }
          .printable-swot-document {
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 11pt !important;
            color: #000 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .printable-swot-document h4 {
            font-size: 12pt !important;
            font-weight: bold !important;
            margin-top: 12px !important;
            margin-bottom: 6px !important;
          }
          .printable-swot-document ul li {
            list-style-type: disc !important;
            font-size: 10pt !important;
          }
        }
      `}),e.jsxs("div",{className:"bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-emerald-200/80 no-print",children:[e.jsxs("div",{className:"flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-4",children:[e.jsxs("div",{children:[e.jsxs("h1",{className:"text-3xl lg:text-4xl font-black bg-gradient-to-r from-emerald-900 via-green-700 to-teal-800 bg-clip-text text-transparent flex items-center gap-2.5",children:[e.jsx(Lr,{className:"w-8 h-8 text-emerald-600 animate-pulse"}),"Automated OBE Reports"]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2 mt-2 text-gray-700 font-semibold text-sm",children:[e.jsxs("span",{className:"font-bold text-gray-900",children:[(r==null?void 0:r.courseCode)||"Course"," - ",(r==null?void 0:r.courseTitle)||"Title"]}),(r==null?void 0:r.batchName)&&e.jsxs("span",{className:"px-2.5 py-0.5 bg-emerald-100/80 text-emerald-900 rounded-full text-xs font-bold",children:["Batch: ",r.batchName]}),(r==null?void 0:r.sectionName)&&e.jsx("span",{className:"px-2.5 py-0.5 bg-blue-100/80 text-blue-900 rounded-full text-xs font-bold",children:r.sectionName.includes("Section")?r.sectionName:`Section: ${r.sectionName}`}),(r==null?void 0:r.semesterName)&&e.jsxs("span",{className:"px-2.5 py-0.5 bg-purple-100/80 text-purple-900 rounded-full text-xs font-bold",children:["Semester: ",r.semesterName]})]})]}),k!=="allDetails"&&e.jsxs("div",{className:"flex flex-wrap items-center gap-2.5 xl:justify-end w-full xl:w-auto",children:[Z&&e.jsxs("div",{className:"inline-flex items-center p-1 bg-gray-100/90 rounded-xl border border-gray-200 shadow-inner",children:[e.jsxs("button",{type:"button",onClick:()=>Z("section"),className:`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${M==="section"?"bg-white text-emerald-900 shadow-md border border-emerald-200/80":"text-gray-600 hover:text-gray-900 hover:bg-white/60"}`,title:"Generate report for your specific section only",children:[e.jsx(Fr,{className:"w-3.5 h-3.5 text-emerald-600"}),e.jsxs("span",{children:["Section ",(r==null?void 0:r.rawSectionName)||"Report"]})]}),e.jsxs("button",{type:"button",onClick:()=>Z("combined"),className:`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${M==="combined"?"bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 text-white shadow-md":"text-gray-600 hover:text-gray-900 hover:bg-white/60"}`,title:"Generate combined aggregate report across all sections of this batch",children:[e.jsx(Mt,{className:"w-3.5 h-3.5"}),e.jsx("span",{children:"Combined Batch Report"})]})]}),e.jsxs("button",{onClick:()=>window.print(),className:"flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 hover:shadow active:scale-95",children:[e.jsx(hr,{size:15}),e.jsx("span",{children:"Print Report"})]}),k!=="compare"&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{onClick:me,className:"flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95",children:[e.jsx(Ue,{size:15}),e.jsx("span",{children:"Download Excel"})]}),k==="batch"&&e.jsxs("button",{onClick:ft,className:"flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95",children:[e.jsx(Ue,{size:15}),e.jsx("span",{children:"Export Word Report"})]}),k==="individual"&&v&&e.jsxs("button",{onClick:()=>qe(v),className:"flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95",children:[e.jsx(Ue,{size:15}),e.jsx("span",{children:"Export Word Report"})]})]})]})]}),e.jsx("div",{className:"flex flex-nowrap overflow-x-auto gap-1 sm:gap-2 border-b-2 border-green-200 tabs-container mt-6 no-scrollbar scrollbar-none",children:[{id:"overview",label:"Course Overview"},{id:"batch",label:M==="combined"?"CO/PO Attainment (Batch)":"CO/PO Attainment (Section)"},{id:"individual",label:"Student Analysis"},{id:"compare",label:"Comparative Analysis"},{id:"allDetails",label:"Mapping Details"},{id:"swot",label:"SWOT Analysis"}].map(t=>e.jsx("button",{onClick:()=>le(t.id),className:`px-3.5 sm:px-4 lg:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 rounded-t-lg -mb-[2px] ${k===t.id?"border-b-4 border-green-700 text-green-800 bg-green-50":"text-gray-500 hover:text-green-700 hover:bg-green-50/50"}`,children:t.label},t.id))})]}),e.jsxs("div",{className:"print-report-container space-y-8",children:[k==="overview"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-5 gap-6",children:[e.jsxs("div",{id:"co-attainment-chart",className:"lg:col-span-3 bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent uppercase tracking-wider",children:"Course Outcomes (COs) Attainment"}),e.jsx("button",{onClick:()=>xt("co-attainment-chart","CO_Attainment"),className:"flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md no-print",title:"Download chart",children:e.jsx(Ue,{size:14})})]}),e.jsx(Oe,{width:"100%",height:450,children:e.jsxs(_e,{data:Array.from({length:12},(t,s)=>{var d,b;const c=`CO${s+1}`;return{name:c,[`Above Pass Marks (${m}%)`]:((d=S.coAttainment[c])==null?void 0:d.passMarksPercentage)||0,[`Above KPI (${l}%)`]:((b=S.coAttainment[c])==null?void 0:b.kpiPercentage)||0}}),margin:{top:20,right:30,left:20,bottom:5},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"colorPassMarks",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:Ne.lightBlue,stopOpacity:.9}),e.jsx("stop",{offset:"95%",stopColor:Ne.accent,stopOpacity:.9})]}),e.jsxs("linearGradient",{id:"colorKPI",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:Ne.lightGold,stopOpacity:.9}),e.jsx("stop",{offset:"95%",stopColor:Ne.secondary,stopOpacity:.9})]})]}),e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2}}),e.jsx(Se,{domain:[0,100],ticks:[0,20,40,60,80,100],tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2},label:{value:"Percentage (%)",angle:-90,position:"insideLeft",fill:"#1a5f3f",style:{fontWeight:"bold"}}}),e.jsx(Fe,{contentStyle:{backgroundColor:"rgba(255,255,255,0.95)",border:"2px solid #1a5f3f",borderRadius:"8px"},formatter:t=>[`${parseFloat(t).toFixed(1)}%`,""],labelFormatter:t=>`${t}`}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:100,dataKey:`Above Pass Marks (${m}%)`,fill:"url(#colorPassMarks)",radius:[8,8,0,0],stroke:Ne.accent,strokeWidth:1}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:200,dataKey:`Above KPI (${l}%)`,fill:"url(#colorKPI)",radius:[8,8,0,0],stroke:Ne.secondary,strokeWidth:1}),e.jsx(pt,{wrapperStyle:{paddingTop:"16px"}})]},`co-attain-${X}`)})]}),e.jsxs("div",{id:"co-distribution-chart",className:"lg:col-span-2 bg-gradient-to-br from-white to-orange-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-orange-100",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-orange-800 to-orange-600 bg-clip-text text-transparent uppercase tracking-wider",children:"CO Student Distribution"}),e.jsx("button",{onClick:()=>xt("co-distribution-chart","CO_Distribution"),className:"flex items-center justify-center p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-md no-print",title:"Download chart",children:e.jsx(Ue,{size:14})})]}),e.jsx(Oe,{width:"100%",height:450,children:e.jsxs(_e,{data:Array.from({length:12},(t,s)=>{const c=`CO${s+1}`;let d=0,b=0,p=0;if(!a.some(g=>{var x;return(((x=S.studentCOs[g.id])==null?void 0:x[c])||0)>0}))return null;a.forEach(g=>{var w;const x=((w=S.studentCOs[g.id])==null?void 0:w[c])||0;x>0&&x<40?d++:x>=40&&x<80?b++:x>=80&&p++});const A=a.length;return{name:c,"Below 40%":Math.round(d/A*100),"40–79%":Math.round(b/A*100),"≥80%":Math.round(p/A*100)}}).filter(Boolean),margin:{top:20,right:20,left:10,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2}}),e.jsx(Se,{domain:[0,100],ticks:[0,20,40,60,80,100],tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2},label:{value:"% of Students",angle:-90,position:"insideLeft",fill:"#1a5f3f",style:{fontWeight:"bold"}}}),e.jsx(Fe,{contentStyle:{backgroundColor:"rgba(255,255,255,0.95)",border:"2px solid #1a5f3f",borderRadius:"8px"},formatter:t=>`${Math.round(t)}%`}),e.jsx(pt,{wrapperStyle:{paddingTop:"12px"}}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:100,dataKey:"Below 40%",stackId:"a",fill:"#ef4444"}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:200,dataKey:"40–79%",stackId:"a",fill:"#f59e0b"}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:300,dataKey:"≥80%",stackId:"a",fill:"#22c55e",radius:[4,4,0,0]})]},`co-dist-${X}`)})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-5 gap-6",children:[e.jsxs("div",{id:"po-bar-chart",className:"lg:col-span-3 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider",children:"Program Outcomes (POs) Attainment"}),e.jsx("button",{onClick:()=>xt("po-bar-chart","PO_Attainment_Bar"),className:"flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md no-print",title:"Download chart",children:e.jsx(Ue,{size:14})})]}),e.jsx(Oe,{width:"100%",height:450,children:e.jsxs(_e,{data:Array.from({length:12},(t,s)=>{var d,b;const c=`PO${s+1}`;return{name:c,[`Above Pass Marks (${m}%)`]:((d=S.poAttainment[c])==null?void 0:d.passMarksPercentage)||0,[`Above KPI (${h}%)`]:((b=S.poAttainment[c])==null?void 0:b.kpiPercentage)||0}}),margin:{top:20,right:30,left:20,bottom:5},children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:"colorPOPassMarks",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:Ne.lightBlue,stopOpacity:.9}),e.jsx("stop",{offset:"95%",stopColor:Ne.accent,stopOpacity:.9})]}),e.jsxs("linearGradient",{id:"colorPOKPI",x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:Ne.lightGold,stopOpacity:.9}),e.jsx("stop",{offset:"95%",stopColor:Ne.secondary,stopOpacity:.9})]})]}),e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2}}),e.jsx(Se,{domain:[0,100],ticks:[0,20,40,60,80,100],tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2},label:{value:"Percentage (%)",angle:-90,position:"insideLeft",fill:"#1a5f3f",style:{fontWeight:"bold"}}}),e.jsx(Fe,{contentStyle:{backgroundColor:"rgba(255,255,255,0.95)",border:"2px solid #1a5f3f",borderRadius:"8px"},formatter:t=>`${parseFloat(t).toFixed(1)}%`}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:100,dataKey:`Above Pass Marks (${m}%)`,fill:"url(#colorPOPassMarks)",radius:[8,8,0,0],stroke:Ne.accent,strokeWidth:1}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:200,dataKey:`Above KPI (${h}%)`,fill:"url(#colorPOKPI)",radius:[8,8,0,0],stroke:Ne.secondary,strokeWidth:1}),e.jsx(pt,{wrapperStyle:{paddingTop:"16px"}})]},`po-attain-${X}`)})]}),e.jsxs("div",{id:"po-contribution-chart",className:"lg:col-span-2 bg-gradient-to-br from-white to-purple-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-purple-100",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider",children:"PO Contribution from COs"}),e.jsx("button",{onClick:()=>xt("po-contribution-chart","PO_Contribution"),className:"flex items-center justify-center p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md no-print",title:"Download chart",children:e.jsx(Ue,{size:14})})]}),e.jsx(Oe,{width:"100%",height:400,children:e.jsxs(_e,{layout:"vertical",barSize:20,data:(()=>{var s,c;const t=[];for(let d=1;d<=12;d++){const b=`PO${d}`,p={name:b};let u=!1;for(let A=1;A<=12;A++){const g=`CO${A}`;((s=i==null?void 0:i[g])==null?void 0:s[b])===1&&(p[`${g} (KPI)`]=((c=S.coAttainment[g])==null?void 0:c.kpiPercentage)||0,u=!0)}u&&t.push(p)}return t})(),margin:{top:20,right:30,left:30,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{type:"number",domain:[0,100],ticks:[0,20,40,60,80,100],tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2}}),e.jsx(Se,{type:"category",dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2},width:45}),e.jsx(Fe,{contentStyle:{backgroundColor:"rgba(255,255,255,0.95)",border:"2px solid #6b21a8",borderRadius:"8px"},formatter:(t,s)=>[`${parseFloat(t).toFixed(1)}%`,s]}),e.jsx(pt,{wrapperStyle:{paddingTop:"12px"}}),Array.from({length:12},(t,s)=>{const c=`CO${s+1}`;if(!Array.from({length:12},(p,u)=>{var A;return((A=i==null?void 0:i[c])==null?void 0:A[`PO${u+1}`])===1}).some(Boolean))return null;const b=Ce[s%Ce.length];return e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",animationBegin:150,dataKey:`${c} (KPI)`,fill:b,radius:[0,4,4,0]},`${c}-kpi`)}).filter(Boolean)]},`po-contrib-${X}`)})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100",children:[e.jsxs("h3",{className:"text-xl font-bold text-green-900 mb-3 border-b-2 border-green-800 pb-1 flex items-center gap-2",children:[e.jsx(Lt,{className:"w-5 h-5 text-green-700"}),"Course Outcomes (COs) Attainment"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-gradient-to-r from-green-700 to-green-800 text-white text-sm",children:[e.jsx("th",{className:"px-4 py-3 text-left font-bold border border-green-900",children:"CO"}),e.jsxs("th",{className:"px-4 py-3 text-center font-bold border border-green-900",children:["% Above Pass Marks (",m,"%)"]}),e.jsxs("th",{className:"px-4 py-3 text-center font-bold border border-green-900",children:["% Above KPI (",l,"%)"]})]})}),e.jsx("tbody",{children:C.map(t=>{const s=S.coAttainment[t];return e.jsxs("tr",{className:"hover:bg-green-50/50 transition-colors",children:[e.jsx("td",{className:"px-4 py-2.5 text-sm font-bold text-gray-800 border border-gray-200 bg-white",children:t}),e.jsxs("td",{className:"px-4 py-2.5 text-sm text-center border border-gray-200 bg-white font-semibold text-blue-700",children:[((s==null?void 0:s.passMarksPercentage)||0).toFixed(1),"%"]}),e.jsxs("td",{className:`px-4 py-2.5 text-sm text-center border border-gray-200 font-bold ${(s==null?void 0:s.kpiPercentage)>=l?"text-green-700 bg-green-50":"text-red-600 bg-red-50"}`,children:[((s==null?void 0:s.kpiPercentage)||0).toFixed(1),"%"]})]},t)})})]})})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100",children:[e.jsxs("h3",{className:"text-xl font-bold text-green-900 mb-3 border-b-2 border-green-800 pb-1 flex items-center gap-2",children:[e.jsx(Bt,{className:"w-5 h-5 text-green-700"}),"Program Outcomes (POs) Attainment"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-gradient-to-r from-green-700 to-green-800 text-white text-sm",children:[e.jsx("th",{className:"px-4 py-3 text-left font-bold border border-green-900",children:"PO"}),e.jsxs("th",{className:"px-4 py-3 text-center font-bold border border-green-900",children:["% Above Pass Marks (",m,"%)"]}),e.jsxs("th",{className:"px-4 py-3 text-center font-bold border border-green-900",children:["% Above KPI (",h,"%)"]})]})}),e.jsx("tbody",{children:J.map(t=>{const s=S.poAttainment[t];return e.jsxs("tr",{className:"hover:bg-green-50/50 transition-colors",children:[e.jsx("td",{className:"px-4 py-2.5 text-sm font-bold text-gray-800 border border-gray-200 bg-white",children:t}),e.jsxs("td",{className:"px-4 py-2.5 text-sm text-center border border-gray-200 bg-white font-semibold text-blue-700",children:[((s==null?void 0:s.passMarksPercentage)||0).toFixed(1),"%"]}),e.jsxs("td",{className:`px-4 py-2.5 text-sm text-center border border-gray-200 font-bold ${(s==null?void 0:s.kpiPercentage)>=h?"text-green-700 bg-green-50":"text-red-600 bg-red-50"}`,children:[((s==null?void 0:s.kpiPercentage)||0).toFixed(1),"%"]})]},t)})})]})})]})]}),e.jsxs("div",{id:"co-heatmap-chart",className:"bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent uppercase tracking-wider mb-4",children:"CO Attainment Heatmap"}),e.jsx("div",{className:`overflow-x-auto ${a.length>20?"max-h-[600px] overflow-y-auto shadow-inner":""}`,children:e.jsxs("table",{className:"w-full border-collapse text-xs",children:[e.jsx("thead",{className:"sticky top-0 z-10",children:e.jsxs("tr",{className:"bg-gradient-to-r from-green-700 to-green-800 text-white",children:[e.jsx("th",{className:"px-3 py-3 text-left font-bold border border-green-900 sticky left-0 bg-green-700 z-20 w-[180px]",children:"Student ID / Roll"}),e.jsx("th",{className:"px-3 py-3 text-left font-bold border border-green-900 sticky left-[180px] bg-green-700 z-20 w-[200px]",children:"Student Name"}),C.map(t=>e.jsx("th",{className:"px-2 py-3 text-center font-bold border border-green-900",children:t},t))]})}),e.jsx("tbody",{children:a.map(t=>e.jsxs("tr",{className:"hover:bg-green-50/30 transition-colors",children:[e.jsx("td",{className:"px-3 py-2 font-bold text-gray-700 border border-gray-200 sticky left-0 bg-white z-10 w-[180px]",children:t.id}),e.jsx("td",{className:"px-3 py-2 font-semibold text-gray-700 border border-gray-200 sticky left-[180px] bg-white z-10 w-[200px] truncate",children:t.name}),C.map(s=>{var b;const c=((b=S.studentCOs[t.id])==null?void 0:b[s])||0;let d="bg-gray-100 text-gray-400";return c<m?d="bg-red-400 text-white font-bold":c<l?d="bg-yellow-300 text-gray-800 font-bold":d="bg-green-500 text-white font-bold",e.jsxs("td",{className:`px-2 py-2 text-center border border-gray-200 ${d}`,children:[c.toFixed(1),"%"]},s)})]},t.id))})]})}),e.jsxs("div",{className:"flex flex-wrap items-center gap-4 justify-center mt-4 pt-3 border-t border-gray-200 text-xs font-semibold",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("div",{className:"w-4 h-4 rounded bg-red-400"}),e.jsxs("span",{className:"text-gray-600",children:["<"," ",m,"% (Below Pass)"]})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("div",{className:"w-4 h-4 rounded bg-yellow-300"}),e.jsxs("span",{className:"text-gray-600",children:[m,"%–",l-1,"% (Between Target)"]})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("div",{className:"w-4 h-4 rounded bg-green-500"}),e.jsxs("span",{className:"text-gray-600",children:["≥ ",l,"% (KPI Met)"]})]})]})]}),e.jsxs("div",{id:"po-heatmap-chart",className:"bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-105 mt-6",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-4",children:"PO Attainment Heatmap"}),e.jsx("div",{className:`overflow-x-auto ${a.length>20?"max-h-[600px] overflow-y-auto shadow-inner":""}`,children:e.jsxs("table",{className:"w-full border-collapse text-xs",children:[e.jsx("thead",{className:"sticky top-0 z-10",children:e.jsxs("tr",{className:"bg-gradient-to-r from-blue-700 to-blue-800 text-white",children:[e.jsx("th",{className:"px-3 py-3 text-left font-bold border border-blue-900 sticky left-0 bg-blue-700 z-20 w-[180px]",children:"Student ID / Roll"}),e.jsx("th",{className:"px-3 py-3 text-left font-bold border border-blue-900 sticky left-[180px] bg-blue-700 z-20 w-[200px]",children:"Student Name"}),J.map(t=>e.jsx("th",{className:"px-2 py-3 text-center font-bold border border-blue-900",children:t},t))]})}),e.jsx("tbody",{children:a.map(t=>e.jsxs("tr",{className:"hover:bg-blue-50/30 transition-colors",children:[e.jsx("td",{className:"px-3 py-2 font-bold text-gray-700 border border-gray-200 sticky left-0 bg-white z-10 w-[180px]",children:t.id}),e.jsx("td",{className:"px-3 py-2 font-semibold text-gray-700 border border-gray-200 sticky left-[180px] bg-white z-10 w-[200px] truncate",children:t.name}),J.map(s=>{var b;const c=((b=S.studentPOs[t.id])==null?void 0:b[s])||0;let d="bg-gray-100 text-gray-400";return c<m?d="bg-red-400 text-white font-bold":c<h?d="bg-yellow-300 text-gray-800 font-bold":d="bg-green-500 text-white font-bold",e.jsxs("td",{className:`px-2 py-2 text-center border border-gray-200 ${d}`,children:[c.toFixed(1),"%"]},s)})]},t.id))})]})}),e.jsxs("div",{className:"flex flex-wrap items-center gap-4 justify-center mt-4 pt-3 border-t border-gray-200 text-xs font-semibold",children:[e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("div",{className:"w-4 h-4 rounded bg-red-400"}),e.jsxs("span",{className:"text-gray-600",children:["<"," ",m,"% (Below Pass)"]})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("div",{className:"w-4 h-4 rounded bg-yellow-300"}),e.jsxs("span",{className:"text-gray-600",children:[m,"%–",h-1,"% (Between Target)"]})]}),e.jsxs("div",{className:"flex items-center gap-1.5",children:[e.jsx("div",{className:"w-4 h-4 rounded bg-green-500"}),e.jsxs("span",{className:"text-gray-600",children:["≥ ",h,"% (KPI Met)"]})]})]})]})]}),k==="individual"&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",children:[e.jsxs("div",{className:"lg:col-span-8 space-y-6",children:[e.jsx("div",{className:"bg-white rounded-2xl shadow-md p-5 border border-green-100 no-print",children:e.jsxs("div",{className:"w-full",children:[e.jsx("label",{className:"block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5",children:"Select Student"}),e.jsxs("select",{value:v,onChange:t=>$(t.target.value),className:"w-full px-4 py-2.5 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700 font-bold text-sm shadow-sm",children:[e.jsx("option",{value:"",children:"Select student roll number..."}),a.map(t=>e.jsxs("option",{value:t.id,children:[t.id," - ",t.name]},t.id))]})]})}),!v&&e.jsxs("div",{className:"bg-white rounded-2xl shadow-md p-8 text-center border border-gray-200",children:[e.jsx(Mt,{className:"w-12 h-12 text-green-600 mx-auto mb-3 opacity-60"}),e.jsx("p",{className:"text-gray-500 font-bold text-lg",children:"Please select a student to view their marksheet and outcome attainment details."})]}),v&&(()=>{const t=a.find(g=>g.id===v);if(!t)return null;const s=ne[v]||0,c=F>0?s/F*100:0,{grade:d,gp:b}=Ge(c),p=c>=m?"Pass":"Below Pass";We[v];const u=Y.filter(g=>g.parent==="Mid Term").reduce((g,x)=>g+x.maxMarks,0),A=Y.filter(g=>g.parent==="Term Final").reduce((g,x)=>g+x.maxMarks,0);return e.jsxs("div",{className:"bg-white rounded-2xl shadow-md p-6 border border-green-100 space-y-6",children:[e.jsx("div",{className:"border-b border-gray-100 pb-4",children:e.jsxs("h3",{className:"text-lg font-black text-green-900 flex items-center gap-2 uppercase tracking-wider",children:[e.jsx(Dr,{className:"w-5 h-5 text-green-700"}),"Student Analysis"]})}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-xs",children:[e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Student ID"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:t.id})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Course Code"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:r.courseCode||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Student Name"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:t.name})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Course Title"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:r.courseTitle||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Batch"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:r.batchName||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Credit Hours"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:r.creditHours||"3 Credits"})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Section"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:r.sectionName||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-100",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Teacher"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:r.teacherName||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-1 md:col-span-2",children:[e.jsx("span",{className:"font-bold text-gray-400",children:"Academic Session"}),e.jsxs("span",{className:"font-extrabold text-gray-800",children:[r.semesterName||"N/A"," (",r.academicYear||"",")"]})]})]}),e.jsx("div",{className:"overflow-x-auto border border-gray-200 rounded-xl",children:e.jsxs("table",{className:"w-full border-collapse text-left text-xs",children:[e.jsxs("thead",{children:[e.jsxs("tr",{className:"bg-gray-100 text-gray-700 font-bold",children:[e.jsx("th",{rowSpan:"2",className:"px-3 py-2 border-b border-r border-gray-200 align-middle",children:"Assessment"}),te.CT>0&&e.jsx("th",{colSpan:te.CT,className:"px-2 py-1.5 border-b border-r border-gray-200 bg-green-50 text-green-800 text-center",children:"CT"}),te.Others>0&&e.jsx("th",{colSpan:te.Others,className:"px-2 py-1.5 border-b border-r border-gray-200 bg-blue-50 text-blue-800 text-center",children:"Others"}),te["Mid Term"]>0&&e.jsxs("th",{colSpan:te["Mid Term"],className:"px-2 py-1.5 border-b border-r border-gray-200 bg-yellow-50 text-yellow-800 text-center",children:["Mid Term (",u,")"]}),te["Term Final"]>0&&e.jsxs("th",{colSpan:te["Term Final"],className:"px-2 py-1.5 border-b border-r border-gray-200 bg-purple-50 text-purple-800 text-center",children:["Term Final (",A,")"]}),e.jsxs("th",{rowSpan:"2",className:"px-3 py-2 border-b border-gray-200 text-center align-middle bg-gray-50 text-gray-800",children:["Total (",F,")"]})]}),e.jsx("tr",{className:"bg-gray-50/50 text-gray-500 font-semibold",children:Y.map(g=>e.jsxs("th",{className:"px-2 py-1.5 border-b border-r border-gray-200 text-center",children:[g.name," ",!(g.parent==="Mid Term"||g.parent==="Term Final")&&`(${g.maxMarks})`]},g.id))})]}),e.jsxs("tbody",{children:[e.jsxs("tr",{className:"border-b border-gray-200 hover:bg-gray-50/30",children:[e.jsx("td",{className:"px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600",children:"Maximum Marks"}),Y.map(g=>e.jsx("td",{className:"px-2 py-2 border-r border-gray-200 text-center text-gray-500 font-medium",children:g.maxMarks},g.id)),e.jsx("td",{className:"px-3 py-2 text-center font-bold bg-gray-50 text-gray-600",children:F})]}),e.jsxs("tr",{className:"border-b border-gray-200 hover:bg-gray-50/30",children:[e.jsx("td",{className:"px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600",children:"CO Mapping"}),Y.map(g=>e.jsx("td",{className:"px-2 py-2 border-r border-gray-200 text-center text-indigo-700 font-bold",children:g.co||"-"},g.id)),e.jsx("td",{className:"px-3 py-2 text-center font-bold bg-gray-50 text-gray-400",children:"-"})]}),e.jsxs("tr",{className:"border-b border-gray-200 hover:bg-gray-50/30",children:[e.jsx("td",{className:"px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600",children:"Obtained Marks"}),Y.map(g=>e.jsx("td",{className:"px-2 py-2 border-r border-gray-200 text-center font-black text-gray-800",children:q(t,g).toFixed(1)},g.id)),e.jsx("td",{className:"px-3 py-2 text-center font-extrabold bg-green-50 text-green-800",children:s.toFixed(1)})]}),e.jsxs("tr",{className:"hover:bg-gray-50/30",children:[e.jsx("td",{className:"px-3 py-2 border-r border-gray-200 font-bold bg-gray-50 text-gray-600",children:"Percentage (%)"}),Y.map(g=>{const x=q(t,g),w=g.maxMarks>0?x/g.maxMarks*100:0;return e.jsxs("td",{className:"px-2 py-2 border-r border-gray-200 text-center text-gray-500 font-semibold",children:[w.toFixed(1),"%"]},g.id)}),e.jsxs("td",{className:"px-3 py-2 text-center font-black bg-green-50 text-green-800",children:[c.toFixed(2),"%"]})]})]})]})}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-5 gap-3 pt-2",children:[e.jsxs("div",{className:"bg-gray-50 border border-gray-100 p-3 rounded-xl text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-400 uppercase tracking-wider",children:"Total Obtained Marks"}),e.jsxs("p",{className:"text-sm font-extrabold text-gray-800 mt-1",children:[s.toFixed(1)," / ",F]})]}),e.jsxs("div",{className:"bg-green-50/50 border border-green-100 p-3 rounded-xl text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-green-600 uppercase tracking-wider",children:"Overall Percentage"}),e.jsxs("p",{className:"text-sm font-black text-green-700 mt-1",children:[c.toFixed(2),"%"]})]}),e.jsxs("div",{className:"bg-yellow-50/50 border border-yellow-100 p-3 rounded-xl text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-yellow-700 uppercase tracking-wider",children:"Letter Grade"}),e.jsx("p",{className:"text-sm font-black text-yellow-700 mt-1",children:d})]}),e.jsxs("div",{className:"bg-green-50/50 border border-green-100 p-3 rounded-xl text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-green-600 uppercase tracking-wider",children:"Grade Point"}),e.jsx("p",{className:"text-sm font-black text-green-700 mt-1",children:b.toFixed(2)})]}),e.jsxs("div",{className:`border p-3 rounded-xl text-center col-span-2 md:col-span-1 ${p==="Pass"?"bg-green-100/50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-800"}`,children:[e.jsx("p",{className:"text-[10px] font-bold uppercase tracking-wider",children:"Pass / Fail"}),e.jsx("p",{className:"text-sm font-black mt-1",children:p})]})]})]})})()]}),e.jsx("div",{className:"lg:col-span-4 space-y-6",children:v&&(()=>{if(!a.find(g=>g.id===v))return null;const s=ne[v]||0,c=F>0?s/F*100:0,{grade:d,gp:b}=Ge(c),p=c>=m?"Pass":"Below Pass",u=We[v],A=(()=>{const g={A:0,B:0,C:0,D:0,F:0};a.forEach(w=>{const V=ne[w.id]||0,I=F>0?V/F*100:0;I>=80?g.A++:I>=70?g.B++:I>=60?g.C++:I>=50?g.D++:g.F++});const x=a.length||1;return[{name:"A (80-100%)",value:g.A,pct:g.A/x*100,color:"#10b981"},{name:"B (70-79%)",value:g.B,pct:g.B/x*100,color:"#eab308"},{name:"C (60-69%)",value:g.C,pct:g.C/x*100,color:"#3b82f6"},{name:"D (50-59%)",value:g.D,pct:g.D/x*100,color:"#f97316"},{name:"F (<50%)",value:g.F,pct:g.F/x*100,color:"#ef4444"}]})();return e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"bg-white rounded-2xl shadow-md p-5 border border-green-100 space-y-4",children:[e.jsxs("h4",{className:"text-sm font-black text-green-955 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-2.5",children:[e.jsx(zt,{className:"w-4 h-4 text-green-700"}),"Performance Summary"]}),e.jsxs("div",{className:"space-y-3 text-xs font-semibold text-gray-700",children:[e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-50",children:[e.jsx("span",{children:"Total Assessments"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:he.length})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-50",children:[e.jsx("span",{children:"Total Marks"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:F})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-50",children:[e.jsx("span",{children:"Marks Obtained"}),e.jsx("span",{className:"font-extrabold text-gray-800",children:s.toFixed(1)})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-50",children:[e.jsx("span",{children:"Overall Percentage"}),e.jsxs("span",{className:"font-extrabold text-green-700",children:[c.toFixed(2),"%"]})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-50",children:[e.jsx("span",{children:"Class Rank"}),e.jsxs("span",{className:"font-extrabold text-gray-800",children:[u," / ",a.length]})]}),e.jsxs("div",{className:"flex justify-between py-1 border-b border-gray-50",children:[e.jsx("span",{children:"Grade"}),e.jsxs("span",{className:"font-extrabold text-yellow-600",children:[d," (",b.toFixed(2),")"]})]}),e.jsxs("div",{className:"flex justify-between py-1",children:[e.jsx("span",{children:"Pass Status"}),e.jsx("span",{className:`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${p==="Pass"?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`,children:p})]})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-md p-5 border border-green-100 space-y-4",children:[e.jsxs("h4",{className:"text-sm font-black text-green-955 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-2.5",children:[e.jsx(Mt,{className:"w-4 h-4 text-green-700"}),"Performance Distribution (Class)"]}),e.jsxs("div",{className:"relative flex justify-center items-center h-44",children:[e.jsx(Oe,{width:"100%",height:"100%",children:e.jsx(pr,{children:e.jsx(Ve,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",data:A,cx:"50%",cy:"50%",innerRadius:50,outerRadius:70,paddingAngle:3,dataKey:"value",children:A.map((g,x)=>e.jsx(At,{fill:g.color},`cell-${x}`))})},`ind-pie-${X}`)}),e.jsxs("div",{className:"absolute text-center",children:[e.jsx("p",{className:"text-xl font-black text-gray-800",children:a.length}),e.jsx("p",{className:"text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Students"})]})]}),e.jsx("div",{className:"space-y-1.5 pt-2 border-t border-gray-50 text-[11px] font-bold text-gray-600",children:A.map((g,x)=>e.jsxs("div",{className:"flex justify-between items-center",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-2.5 h-2.5 rounded-full",style:{backgroundColor:g.color}}),e.jsx("span",{children:g.name})]}),e.jsxs("span",{className:"text-gray-800 font-extrabold",children:[g.value," (",g.pct.toFixed(1),"%)"]})]},x))})]})]})})()})]}),v&&(()=>{const t=a.find(x=>x.id===v);if(!t)return null;const s=C.map(x=>{const w=ve[x]||0;let V=0;Y.forEach(Q=>{(Q.co||"").replace(/\s+/g,"").toUpperCase()===x&&(V+=q(t,Q))});const I=w>0?V/w*100:0;return{name:x,Attainment:parseFloat(I.toFixed(2)),color:I>=l?"#1a5f3f":"#ef4444"}}),c=C.filter(x=>{const w=ve[x]||0;let V=0;return Y.forEach(Q=>{(Q.co||"").replace(/\s+/g,"").toUpperCase()===x&&(V+=q(t,Q))}),(w>0?V/w*100:0)>=l}).length,d=C.length,b=d>0?c/d*100:0,p=J.map(x=>{var V;const w=((V=S.studentPOs[v])==null?void 0:V[x])||0;return{name:x,Attainment:parseFloat(w.toFixed(2)),color:w>=h?"#2c5282":"#ef4444"}}),u=J.filter(x=>{var V;return(((V=S.studentPOs[v])==null?void 0:V[x])||0)>=h}).length,A=J.length,g=A>0?u/A*100:0;return e.jsxs("div",{className:"space-y-6 mt-6",children:[e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch",children:[e.jsxs("div",{className:"lg:col-span-8 bg-white rounded-2xl shadow-md p-6 border border-green-100 space-y-4 flex flex-col justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"flex justify-between items-center border-b border-gray-100 pb-3",children:e.jsxs("h3",{className:"text-lg font-black text-green-900 flex items-center gap-2 uppercase tracking-wide",children:[e.jsx(Lt,{className:"w-5 h-5 text-green-700"}),"Course Outcome (CO) Attainment - This Student"]})}),e.jsx("div",{className:"overflow-x-auto border border-gray-200 rounded-xl mt-4",children:e.jsxs("table",{className:"w-full border-collapse text-left text-xs",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-gray-100 text-gray-700 font-bold uppercase",children:[e.jsx("th",{className:"px-4 py-2 border-b border-gray-200",children:"CO"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200",children:"Description"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"Total Obtained"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"Max Marks"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"Percentage (%)"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"KPI Target"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"Status"})]})}),e.jsx("tbody",{children:C.map(x=>{const w=ve[x]||0;let V=0;Y.forEach(ie=>{(ie.co||"").replace(/\s+/g,"").toUpperCase()===x&&(V+=q(t,ie))});const I=w>0?V/w*100:0,Q=I>=l;return e.jsxs("tr",{className:"border-b border-gray-100 hover:bg-gray-50/50",children:[e.jsx("td",{className:"px-4 py-2.5 font-bold text-green-900 border-r border-gray-100",children:x}),e.jsx("td",{className:"px-4 py-2.5 text-gray-600 font-medium",children:se(x)}),e.jsxs("td",{className:"px-4 py-2.5 text-center font-bold text-gray-700",children:[V.toFixed(1)," / ",w]}),e.jsx("td",{className:"px-4 py-2.5 text-center text-gray-500 font-semibold",children:w}),e.jsxs("td",{className:"px-4 py-2.5 text-center font-bold text-gray-800",children:[I.toFixed(2),"%"]}),e.jsxs("td",{className:"px-4 py-2.5 text-center text-gray-500 font-semibold",children:[l,"%"]}),e.jsx("td",{className:"px-4 py-2.5 text-center",children:e.jsx("span",{className:`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${Q?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`,children:Q?"Attained":"Not Attained"})})]},x)})})]})})]}),e.jsxs("p",{className:"text-xs font-black text-green-800 bg-green-50/50 p-2.5 rounded-xl border border-green-100",children:["COs Attained: ",c," / ",d," (",b.toFixed(2),"%)"]})]}),e.jsxs("div",{className:"lg:col-span-4 bg-white rounded-2xl shadow-md p-6 border border-green-100 flex flex-col justify-between",children:[e.jsxs("h3",{className:"text-sm font-black text-green-900 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4",children:[e.jsx(zt,{className:"w-5 h-5 text-green-700"}),"CO Attainment Visualization"]}),e.jsx("div",{className:"flex-1 flex items-center justify-center min-h-[250px]",children:e.jsx(Oe,{width:"100%",height:280,children:e.jsxs(_e,{data:s,margin:{top:20,right:10,left:-20,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold"}}),e.jsx(Se,{domain:[0,100],tick:{fill:"#1a5f3f",fontWeight:"bold"}}),e.jsx(Fe,{formatter:x=>`${x.toFixed(1)}%`}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",dataKey:"Attainment",radius:[4,4,0,0],children:s.map((x,w)=>e.jsx(At,{fill:x.color},`cell-${w}`))}),e.jsx(Ot,{y:l,stroke:"#ef4444",strokeDasharray:"3 3",label:{value:`Target (${l}%)`,position:"top",fill:"#ef4444",fontSize:10,fontWeight:"bold"}})]},`student-co-${X}`)})})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch",children:[e.jsxs("div",{className:"lg:col-span-8 bg-white rounded-2xl shadow-md p-6 border border-blue-100 space-y-4 flex flex-col justify-between",children:[e.jsxs("div",{children:[e.jsx("div",{className:"flex justify-between items-center border-b border-gray-100 pb-3",children:e.jsxs("h3",{className:"text-lg font-black text-blue-900 flex items-center gap-2 uppercase tracking-wide",children:[e.jsx(Bt,{className:"w-5 h-5 text-blue-755"}),"Program Outcome (PO) Attainment - This Student"]})}),e.jsx("div",{className:"overflow-x-auto border border-gray-200 rounded-xl mt-4",children:e.jsxs("table",{className:"w-full border-collapse text-left text-xs",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-gray-100 text-gray-700 font-bold uppercase",children:[e.jsx("th",{className:"px-4 py-2 border-b border-gray-200",children:"PO"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200",children:"Description"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"Weighted Percentage (%)"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"KPI Target (%)"}),e.jsx("th",{className:"px-4 py-2 border-b border-gray-200 text-center",children:"Attainment Status"})]})}),e.jsx("tbody",{children:J.map(x=>{var I;const w=((I=S.studentPOs[v])==null?void 0:I[x])||0,V=w>=h;return e.jsxs("tr",{className:"border-b border-gray-100 hover:bg-gray-50/50",children:[e.jsx("td",{className:"px-4 py-2.5 font-bold text-blue-900 border-r border-gray-100",children:x}),e.jsx("td",{className:"px-4 py-2.5 text-gray-600 font-medium",children:ye(x)}),e.jsxs("td",{className:"px-4 py-2.5 text-center font-bold text-gray-800",children:[w.toFixed(2),"%"]}),e.jsxs("td",{className:"px-4 py-2.5 text-center text-gray-500 font-semibold",children:[h,"%"]}),e.jsx("td",{className:"px-4 py-2.5 text-center",children:e.jsx("span",{className:`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${V?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`,children:V?"Attained":"Not Attained"})})]},x)})})]})})]}),e.jsxs("p",{className:"text-xs font-black text-green-800 bg-green-50/50 p-2.5 rounded-xl border border-green-100",children:["POs Attained: ",u," / ",A," (",g.toFixed(2),"%)"]})]}),e.jsxs("div",{className:"lg:col-span-4 bg-white rounded-2xl shadow-md p-6 border border-blue-100 flex flex-col justify-between",children:[e.jsxs("h3",{className:"text-sm font-black text-blue-900 flex items-center gap-2 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4",children:[e.jsx(zt,{className:"w-5 h-5 text-blue-755"}),"PO Attainment Visualization"]}),e.jsx("div",{className:"flex-1 flex items-center justify-center min-h-[250px]",children:e.jsx(Oe,{width:"100%",height:280,children:e.jsxs(_e,{data:p,margin:{top:20,right:10,left:-20,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#2c5282",fontWeight:"bold"}}),e.jsx(Se,{domain:[0,100],tick:{fill:"#2c5282",fontWeight:"bold"}}),e.jsx(Fe,{formatter:x=>`${x.toFixed(1)}%`}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",dataKey:"Attainment",radius:[4,4,0,0],children:p.map((x,w)=>e.jsx(At,{fill:x.color},`cell-${w}`))}),e.jsx(Ot,{y:h,stroke:"#ef4444",strokeDasharray:"3 3",label:{value:`Target (${h}%)`,position:"top",fill:"#ef4444",fontSize:10,fontWeight:"bold"}})]},`student-po-${X}`)})})]})]}),e.jsxs("div",{className:"hidden",children:[e.jsx("div",{id:`student-co-bar-${v}`,children:e.jsxs(_e,{width:500,height:300,data:C.map(x=>{var w;return{name:x,value:((w=S.studentCOs[v])==null?void 0:w[x])||0}}),children:[e.jsx($e,{dataKey:"name"}),e.jsx(Se,{domain:[0,100]}),e.jsx(Ae,{dataKey:"value",fill:"#1a5f3f"})]})}),e.jsx("div",{id:`student-po-bar-${v}`,children:e.jsxs(_e,{width:500,height:300,data:J.map(x=>{var w;return{name:x,value:((w=S.studentPOs[v])==null?void 0:w[x])||0}}),children:[e.jsx($e,{dataKey:"name"}),e.jsx(Se,{domain:[0,100]}),e.jsx(Ae,{dataKey:"value",fill:"#2c5282"})]})})]})]})})()]}),k==="batch"&&e.jsxs("div",{className:"space-y-8",children:[e.jsx("div",{id:"batch-report-cover",children:e.jsx(ka,{title:M==="combined"?"OBE COMBINED BATCH REPORT":`OBE SECTION REPORT (SEC: ${r.rawSectionName||"A"})`,courseInfo:r,targetPassMarks:m,kpiCO:l,kpiPO:h})}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide",children:"2. Course Information"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm font-semibold text-gray-700",children:[e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100",children:[e.jsx("span",{className:"text-gray-500",children:"Course Code"}),e.jsx("span",{className:"text-green-950 font-bold",children:r.courseCode||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100 gap-4",children:[e.jsx("span",{className:"text-gray-500",children:"Course Title"}),e.jsx("span",{className:"text-green-950 font-bold text-right break-words text-xs sm:text-sm md:text-base",title:r.courseTitle,children:r.courseTitle||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100",children:[e.jsx("span",{className:"text-gray-500",children:"Batch & Section"}),e.jsxs("span",{className:"text-gray-900 font-bold",children:[r.batchName||"N/A"," ",r.sectionName?`(Sec: ${r.sectionName})`:""]})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100",children:[e.jsx("span",{className:"text-gray-500",children:"Academic Session"}),e.jsxs("span",{className:"text-gray-900 font-bold",children:[r.semesterName||"N/A"," ",r.academicYear?`(${r.academicYear})`:""]})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100",children:[e.jsx("span",{className:"text-gray-500",children:"Credit Hours"}),e.jsx("span",{className:"text-gray-900 font-bold",children:r.creditHours||"3 Credits"})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100",children:[e.jsx("span",{className:"text-gray-500",children:"Course Instructor"}),e.jsx("span",{className:"text-gray-900 font-bold",children:r.teacherName||"N/A"})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100",children:[e.jsx("span",{className:"text-gray-500",children:"Total Enrollment"}),e.jsxs("span",{className:"text-gray-900 font-bold",children:[a.length," Students"]})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100",children:[e.jsx("span",{className:"text-gray-500",children:"Total Assessments"}),e.jsx("span",{className:"text-gray-900 font-bold",children:he.length})]}),e.jsxs("div",{className:"flex justify-between py-2 border-b border-gray-100 md:col-span-2",children:[e.jsx("span",{className:"text-gray-500",children:"Report Generated On"}),e.jsx("span",{className:"text-gray-600 font-medium",children:new Date().toLocaleString()})]})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100 page-break",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide",children:"3. Quick Statistics"}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4",children:[e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"Students"}),e.jsx("p",{className:"text-lg font-extrabold text-green-800 mt-1",children:a.length})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"Assessments"}),e.jsx("p",{className:"text-lg font-extrabold text-green-800 mt-1",children:he.length})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"Avg Marks"}),e.jsxs("p",{className:"text-lg font-extrabold text-green-800 mt-1",children:[(E=H.averagePercentage)==null?void 0:E.toFixed(1),"%"]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"Highest"}),e.jsxs("p",{className:"text-sm font-black text-green-800 mt-2 truncate",title:(j=H.highest)==null?void 0:j.name,children:[(xe=H.highest)==null?void 0:xe.percentage.toFixed(1),"%"]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"Lowest"}),e.jsxs("p",{className:"text-sm font-black text-red-700 mt-2 truncate",title:(je=H.lowest)==null?void 0:je.name,children:[(Pe=H.lowest)==null?void 0:Pe.percentage.toFixed(1),"%"]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"Pass Rate"}),e.jsxs("p",{className:"text-lg font-extrabold text-green-800 mt-1",children:[(De=H.passRate)==null?void 0:De.toFixed(1),"%"]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"COs Attained"}),e.jsxs("p",{className:"text-lg font-extrabold text-green-800 mt-1",children:[B," / ",C.length]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"POs Attained"}),e.jsxs("p",{className:"text-lg font-extrabold text-green-800 mt-1",children:[ee," / ",J.length]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/30 border border-green-100 p-3 rounded-xl shadow-sm text-center",children:[e.jsx("p",{className:"text-[10px] font-bold text-gray-500 uppercase tracking-tight",children:"Overall %"}),e.jsxs("p",{className:"text-lg font-extrabold text-green-800 mt-1",children:[(Xe=H.averagePercentage)==null?void 0:Xe.toFixed(1),"%"]})]})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide",children:"4. Assessment Summary"}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse text-left text-xs font-semibold",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-green-600 text-white text-[10px] uppercase tracking-wider",children:[e.jsx("th",{className:"px-4 py-3 border border-green-800",children:"Assessment Name"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-center",children:"Max Marks"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-center",children:"Class Average"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-center",children:"Highest Mark"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-center",children:"Highest Scorer"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-center",children:"Lowest Mark"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-center",children:"Lowest Scorer"})]})}),e.jsxs("tbody",{children:[de.map(t=>e.jsxs("tr",{className:"hover:bg-green-50/40 border-b border-gray-200",children:[e.jsx("td",{className:"px-4 py-2 text-gray-800 font-bold",children:t.name}),e.jsx("td",{className:"px-4 py-2 text-center text-gray-600 font-bold",children:t.maxMarks}),e.jsx("td",{className:"px-4 py-2 text-center text-green-800 font-black",children:t.average.toFixed(2)}),e.jsx("td",{className:"px-4 py-2 text-center text-gray-800",children:t.highest}),e.jsx("td",{className:"px-4 py-2 text-center text-green-800 font-normal",children:t.highestScorers}),e.jsx("td",{className:"px-4 py-2 text-center text-gray-800",children:t.lowest}),e.jsx("td",{className:"px-4 py-2 text-center text-red-700 font-normal",children:t.lowestScorers})]},t.id)),e.jsxs("tr",{className:"bg-green-50 font-black text-green-950",children:[e.jsx("td",{className:"px-4 py-2.5 border-t border-green-800",children:"Total Course Mark"}),e.jsx("td",{className:"px-4 py-2.5 text-center border-t border-green-800",children:D.maxMarks}),e.jsx("td",{className:"px-4 py-2.5 text-center text-green-905 border-t border-green-800",children:D.average.toFixed(2)}),e.jsx("td",{className:"px-4 py-2.5 text-center border-t border-green-800",children:D.highest.toFixed(1)}),e.jsx("td",{className:"px-4 py-2.5 text-center text-green-900 border-t border-green-800 font-normal",children:D.highestScorers}),e.jsx("td",{className:"px-4 py-2.5 text-center border-t border-green-800",children:D.lowest.toFixed(1)}),e.jsx("td",{className:"px-4 py-2.5 text-center text-red-800 border-t border-green-800 font-normal",children:D.lowestScorers})]})]})]})})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6 page-break",children:[e.jsxs("div",{id:"grade-dist-chart",className:"bg-white rounded-2xl shadow-md p-5 border border-green-100",children:[e.jsx("h3",{className:"text-md font-bold text-green-950 mb-3 uppercase tracking-wide",children:"5. Grade Distribution"}),e.jsx(Oe,{width:"100%",height:260,children:e.jsxs(_e,{data:T,margin:{top:10,right:10,left:-20,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold",fontSize:10}}),e.jsx(Se,{allowDecimals:!1,tick:{fill:"#1a5f3f",fontWeight:"bold",fontSize:10}}),e.jsx(Fe,{formatter:t=>[`${t} Students`,"Count"]}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",dataKey:"Count",fill:"#1a5f3f",radius:[4,4,0,0]})]},`comp-grade-${X}`)})]}),e.jsxs("div",{id:"perf-dist-chart",className:"bg-white rounded-2xl shadow-md p-5 border border-green-100",children:[e.jsx("h3",{className:"text-md font-bold text-green-950 mb-3 uppercase tracking-wide",children:"6. Performance Distribution"}),e.jsx(Oe,{width:"100%",height:260,children:e.jsxs(_e,{data:ce,margin:{top:10,right:10,left:-20,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold",fontSize:10}}),e.jsx(Se,{allowDecimals:!1,tick:{fill:"#1a5f3f",fontWeight:"bold",fontSize:10}}),e.jsx(Fe,{formatter:t=>[`${t} Students`,"Count"]}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",dataKey:"No. of Students",fill:"#319795",radius:[4,4,0,0]})]},`comp-perf-${X}`)})]}),e.jsxs("div",{id:"assess-weight-chart",className:"bg-white rounded-2xl shadow-md p-5 border border-green-100",children:[e.jsx("h3",{className:"text-md font-bold text-green-950 mb-3 uppercase tracking-wide",children:"7. Assessment Contribution"}),e.jsx(Oe,{width:"100%",height:260,children:e.jsxs(pr,{children:[e.jsx(Ve,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",data:N,dataKey:"value",nameKey:"name",cx:"50%",cy:"50%",outerRadius:75,label:t=>t.name,children:N.map((t,s)=>e.jsx(At,{fill:Ce[s%Ce.length]},`cell-${s}`))}),e.jsx(Fe,{formatter:t=>`${t} Marks`})]},`comp-weight-${X}`)})]})]}),e.jsxs("div",{id:"overall-perf-gauge",className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100 page-break",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-3 uppercase tracking-wide",children:"8. Overall Performance (Gauge)"}),e.jsx("div",{className:"flex justify-center items-center py-4",children:e.jsx(Aa,{value:H.averagePercentage||0})})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide",children:"9. Course Outcome (CO) Attainment"}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6 items-center",children:[e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse text-xs font-semibold",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-green-600 text-white text-[10px] uppercase",children:[e.jsx("th",{className:"px-4 py-2.5 border border-green-800",children:"Outcome"}),e.jsx("th",{className:"px-4 py-2.5 border border-green-800 text-center",children:"Avg Attainment"}),e.jsx("th",{className:"px-4 py-2.5 border border-green-800 text-center",children:"KPI Target"}),e.jsx("th",{className:"px-4 py-2.5 border border-green-800 text-center",children:"Status"})]})}),e.jsx("tbody",{children:C.map(t=>{var d;const s=((d=S.coAttainment[t])==null?void 0:d.kpiPercentage)||0,c=s>=l;return e.jsxs("tr",{className:"hover:bg-green-50/30 border-b border-gray-200",children:[e.jsx("td",{className:"px-4 py-2 font-bold text-gray-800",children:t}),e.jsxs("td",{className:"px-4 py-2 text-center text-green-950 font-black",children:[s.toFixed(1),"%"]}),e.jsxs("td",{className:"px-4 py-2 text-center text-gray-600 font-bold",children:[l,"%"]}),e.jsx("td",{className:"px-4 py-2 text-center",children:e.jsx("span",{className:`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${c?"bg-green-100 text-green-800":"bg-yellow-100 text-yellow-800"}`,children:c?"KPI Met":"Below Target"})})]},t)})})]})}),e.jsx("div",{id:"batch-co-chart",children:e.jsx(Oe,{width:"100%",height:240,children:e.jsxs(_e,{data:C.map(t=>{var s;return{name:t,Attainment:((s=S.coAttainment[t])==null?void 0:s.kpiPercentage)||0}}),margin:{top:10,right:10,left:-20,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold",fontSize:10}}),e.jsx(Se,{domain:[0,100],tick:{fill:"#1a5f3f",fontWeight:"bold",fontSize:10}}),e.jsx(Fe,{formatter:t=>`${parseFloat(t).toFixed(1)}%`}),e.jsx(Ot,{y:l,stroke:"#22c55e",strokeDasharray:"5 5",label:{value:`KPI ${l}%`,fill:"#22c55e",fontSize:9,position:"top"}}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",dataKey:"Attainment",fill:"#319795",radius:[4,4,0,0]})]},`comp-batch-co-${X}`)})})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-blue-100 page-break",children:[e.jsx("h3",{className:"text-lg font-black text-blue-950 mb-4 border-b-2 border-blue-800 pb-1.5 uppercase tracking-wide",children:"10. Program Outcome (PO) Attainment"}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6 items-center",children:[e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse text-xs font-semibold",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-blue-600 text-white text-[10px] uppercase",children:[e.jsx("th",{className:"px-4 py-2.5 border border-blue-800",children:"Outcome"}),e.jsx("th",{className:"px-4 py-2.5 border border-blue-800 text-center",children:"Avg Attainment"}),e.jsx("th",{className:"px-4 py-2.5 border border-blue-800 text-center",children:"KPI Target"}),e.jsx("th",{className:"px-4 py-2.5 border border-blue-800 text-center",children:"Status"})]})}),e.jsx("tbody",{children:J.map(t=>{var d;const s=((d=S.poAttainment[t])==null?void 0:d.kpiPercentage)||0,c=s>=h;return e.jsxs("tr",{className:"hover:bg-blue-50/30 border-b border-gray-200",children:[e.jsx("td",{className:"px-4 py-2 font-bold text-gray-800",children:t}),e.jsxs("td",{className:"px-4 py-2 text-center text-blue-950 font-black",children:[s.toFixed(1),"%"]}),e.jsxs("td",{className:"px-4 py-2 text-center text-gray-600 font-bold",children:[h,"%"]}),e.jsx("td",{className:"px-4 py-2 text-center",children:e.jsx("span",{className:`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${c?"bg-blue-100 text-blue-800":"bg-yellow-100 text-yellow-800"}`,children:c?"KPI Met":"Below Target"})})]},t)})})]})}),e.jsx("div",{id:"batch-po-chart",children:e.jsx(Oe,{width:"100%",height:240,children:e.jsxs(_e,{layout:"vertical",data:J.map(t=>{var s;return{name:t,Attainment:((s=S.poAttainment[t])==null?void 0:s.kpiPercentage)||0}}),margin:{top:10,right:10,left:10,bottom:5},children:[e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{type:"number",domain:[0,100],tick:{fill:"#2c5282",fontSize:10}}),e.jsx(Se,{type:"category",dataKey:"name",tick:{fill:"#2c5282",fontWeight:"bold",fontSize:10},width:40}),e.jsx(Fe,{formatter:t=>`${parseFloat(t).toFixed(1)}%`}),e.jsx(Ot,{x:h,stroke:"#3b82f6",strokeDasharray:"5 5",label:{value:`KPI ${h}%`,fill:"#3b82f6",fontSize:9,position:"insideTopLeft"}}),e.jsx(Ae,{isAnimationActive:!0,animationDuration:1100,animationEasing:"ease-out",dataKey:"Attainment",fill:"#4f46e5",radius:[0,4,4,0]})]},`comp-batch-po-${X}`)})})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6 print:block",children:[e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100",children:[e.jsxs("h3",{className:"text-md font-black text-green-950 mb-3 border-b border-green-200 pb-1 uppercase tracking-wide flex items-center gap-1.5",children:[e.jsx(Bt,{className:"w-5 h-5 text-green-700"}),"11. Top 10 Students"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse text-xs font-semibold",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-green-50 text-green-800 text-[10px] uppercase",children:[e.jsx("th",{className:"px-3 py-2 border border-gray-200 text-center font-bold",children:"Rank"}),e.jsx("th",{className:"px-3 py-2 border border-gray-200 text-left font-bold",children:"Student ID"}),e.jsx("th",{className:"px-3 py-2 border border-gray-200 text-left font-bold",children:"Name"}),e.jsx("th",{className:"px-3 py-2 border border-gray-200 text-center font-bold",children:"Percentage"}),e.jsx("th",{className:"px-3 py-2 border border-gray-200 text-center font-bold",children:"Grade"})]})}),e.jsx("tbody",{children:ge.map(t=>e.jsxs("tr",{className:"hover:bg-green-50/30",children:[e.jsxs("td",{className:"px-3 py-1.5 border border-gray-200 text-center font-bold text-green-700",children:["Rank ",t.rank]}),e.jsx("td",{className:"px-3 py-1.5 border border-gray-200 font-bold text-gray-800",children:t.id}),e.jsx("td",{className:"px-3 py-1.5 border border-gray-200 text-gray-700",children:t.name}),e.jsxs("td",{className:"px-3 py-1.5 border border-gray-200 text-center font-black text-green-800",children:[t.percentage.toFixed(1),"%"]}),e.jsx("td",{className:"px-3 py-1.5 border border-gray-200 text-center font-bold text-gray-800",children:t.grade})]},t.id))})]})})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-red-100 page-break",children:[e.jsxs("h3",{className:"text-md font-black text-red-950 mb-3 border-b border-red-200 pb-1 uppercase tracking-wide flex items-center gap-1.5",children:[e.jsx(sr,{className:"w-5 h-5 text-red-600"}),"12. Students Needing Improvement"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse text-xs font-semibold",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-red-50 text-red-800 text-[10px] uppercase",children:[e.jsx("th",{className:"px-3 py-2 border border-red-200 text-left font-bold",children:"Student ID"}),e.jsx("th",{className:"px-3 py-2 border border-red-200 text-left font-bold",children:"Name"}),e.jsx("th",{className:"px-3 py-2 border border-red-200 text-center font-bold",children:"Overall %"}),e.jsx("th",{className:"px-3 py-2 border border-red-200 text-left font-bold",children:"Weak CO(s)"})]})}),e.jsxs("tbody",{children:[pe.map(t=>{const s=t.weakCOs.join(", ");return e.jsxs("tr",{className:"hover:bg-red-50/20",children:[e.jsx("td",{className:"px-3 py-1.5 border border-red-100 font-bold text-gray-800",children:t.id}),e.jsx("td",{className:"px-3 py-1.5 border border-red-100 text-gray-700",children:t.name}),e.jsxs("td",{className:"px-3 py-1.5 border border-red-100 text-center font-black text-red-600",children:[t.percentage.toFixed(1),"%"]}),e.jsx("td",{className:"px-3 py-1.5 border border-red-100 text-left text-[10px] font-bold text-red-700",children:s||"N/A"})]},t.id)}),pe.length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"text-center py-4 font-bold text-green-700 bg-green-50/50",children:"All students are successfully above the KPI threshold."})})]})]})})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide",children:"13. KPI Summary"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-6 text-center font-semibold",children:[e.jsxs("div",{className:"bg-gray-50 border border-gray-200 p-4 rounded-xl",children:[e.jsx("p",{className:"text-xs text-gray-400 font-bold uppercase tracking-wider",children:"Pass Threshold"}),e.jsxs("p",{className:"text-2xl font-black text-gray-800 mt-2",children:[m,"%"]})]}),e.jsxs("div",{className:"bg-green-50/30 border border-green-100 p-4 rounded-xl",children:[e.jsx("p",{className:"text-xs text-green-700 font-bold uppercase tracking-wider",children:"CO KPI Target"}),e.jsxs("p",{className:"text-2xl font-black text-green-900 mt-2",children:[l,"%"]})]}),e.jsxs("div",{className:"bg-blue-50/30 border border-blue-100 p-4 rounded-xl",children:[e.jsx("p",{className:"text-xs text-blue-700 font-bold uppercase tracking-wider",children:"PO KPI Target"}),e.jsxs("p",{className:"text-2xl font-black text-blue-900 mt-2",children:[h,"%"]})]})]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/50 rounded-2xl shadow-lg p-6 border border-green-100",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide",children:"14. Automatic Observations (System Generated)"}),e.jsxs("ul",{className:"list-disc pl-5 space-y-2.5 text-sm font-semibold text-gray-700",children:[e.jsxs("li",{children:["Overall cohort size is ",e.jsxs("strong",{className:"text-green-800",children:[a.length," students"]})," with an average performance score of ",e.jsxs("strong",{className:"text-green-800",children:[(Ze=H.averagePercentage)==null?void 0:Ze.toFixed(2),"%"]}),"."]}),e.jsxs("li",{children:["The class-wide overall pass rate achieved is ",e.jsxs("strong",{className:"text-green-800",children:[(Ht=H.passRate)==null?void 0:Ht.toFixed(2),"%"]}),"."]}),e.jsxs("li",{children:["A total of ",e.jsxs("strong",{className:"text-green-800",children:[B," out of ",C.length," Course Outcomes"]})," successfully met their class attainment target (KPI: ",l,"%).",B<C.length&&e.jsxs("span",{children:[" outcomes needing review: ",e.jsx("strong",{className:"text-red-700",children:C.filter(t=>{var s;return(((s=S.coAttainment[t])==null?void 0:s.kpiPercentage)||0)<l}).join(", ")}),"."]})]}),e.jsxs("li",{children:["A total of ",e.jsxs("strong",{className:"text-green-800",children:[ee," out of ",J.length," Program Outcomes"]})," met the program mapping KPI threshold (KPI: ",h,"%)."]}),e.jsxs("li",{children:["The highest marks percentage scored by a student is ",e.jsxs("strong",{className:"text-green-800",children:[(It=H.highest)==null?void 0:It.percentage.toFixed(1),"%"]}),", whereas the lowest is ",e.jsxs("strong",{className:"text-red-600",children:[(Yt=H.lowest)==null?void 0:Yt.percentage.toFixed(1),"%"]}),"."]})]})]}),e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/50 rounded-2xl shadow-lg p-6 border border-green-100 page-break",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-4 border-b-2 border-green-800 pb-1.5 uppercase tracking-wide",children:"15. Recommendations (System Generated)"}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse text-xs",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-green-600 text-white uppercase tracking-wider text-[10px]",children:[e.jsx("th",{className:"px-4 py-3 border border-green-800 text-left font-bold",children:"Deficit Outcome"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-center font-bold",children:"Attainment"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-left font-bold",children:"Pedagogical strategy"}),e.jsx("th",{className:"px-4 py-3 border border-green-800 text-left font-bold",children:"Syllabus reinforcement"})]})}),e.jsxs("tbody",{children:[C.map(t=>{var d;const s=((d=S.coAttainment[t])==null?void 0:d.kpiPercentage)||0;if(s>=l)return null;const c=Je(t);return e.jsxs("tr",{className:"hover:bg-red-50/20 border-b border-gray-200",children:[e.jsx("td",{className:"px-4 py-2.5 border border-gray-200 font-bold text-red-700 text-sm",children:t}),e.jsxs("td",{className:"px-4 py-2.5 border border-gray-200 text-center font-black text-red-800 text-sm",children:[s.toFixed(1),"%"]}),e.jsx("td",{className:"px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold",children:c.strategy}),e.jsx("td",{className:"px-4 py-2.5 border border-gray-200 text-gray-700 font-medium",children:c.advice})]},t)}),C.every(t=>{var s;return(((s=S.coAttainment[t])==null?void 0:s.kpiPercentage)||0)>=l})&&e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"text-center py-4 font-bold text-green-700 bg-green-50/50",children:"Class-wide KPI targets met for all Course Outcomes. No pedagogical remediation required."})})]})]})})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-lg p-6 border border-green-100",children:[e.jsx("h3",{className:"text-lg font-black text-green-950 mb-3 uppercase tracking-wide",children:"16. Teacher's Reflection (Editable before export)"}),e.jsx("div",{className:"no-print",children:e.jsx("textarea",{className:"w-full h-32 p-3 border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-gray-700 placeholder-gray-400 bg-gray-50/30",placeholder:"Enter course reflections, pedagogical adjustments, and custom action plans for this batch here...",value:G,onChange:t=>L(t.target.value)})}),G&&e.jsxs("div",{className:"hidden print:block bg-green-50/50 border-l-4 border-green-800 p-4 rounded-r-xl mt-2",children:[e.jsx("p",{className:"text-[10px] font-black text-green-800 uppercase tracking-widest",children:"Faculty Review comments & Remarks"}),e.jsx("p",{className:"text-sm font-semibold text-gray-800 mt-1 italic whitespace-pre-wrap",children:G})]})]})]}),k==="compare"&&(()=>{const t=()=>O.length===0?[]:Array.from({length:12},(c,d)=>{const b=`CO${d+1}`,p={name:b};return O.forEach(u=>{var g;const A=a.find(x=>x.id===u);A&&(p[A.name]=((g=S.studentCOs[u])==null?void 0:g[b])||0)}),p});return e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100 no-print",children:[e.jsx("label",{className:"block text-sm font-semibold text-green-700 mb-2",children:"Select Students to Compare (Multiple Selection)"}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border-2 border-green-200 rounded-xl p-4 bg-white/50",children:a.map(s=>e.jsxs("label",{className:"flex items-center gap-2 p-2 hover:bg-green-50 rounded-lg cursor-pointer transition-colors",children:[e.jsx("input",{type:"checkbox",checked:O.includes(s.id),onChange:c=>{c.target.checked?re([...O,s.id]):re(O.filter(d=>d!==s.id))},className:"rounded text-green-600 focus:ring-green-500"}),e.jsxs("span",{className:"text-sm text-gray-700 font-medium",children:[s.id," - ",s.name]})]},s.id))})]}),O.length>0&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{id:"comparison-line-chart",className:"bg-gradient-to-br from-white to-green-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-green-100",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h2",{className:"text-2xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent",children:"Student Comparison - Line Chart"}),e.jsx("button",{onClick:()=>xt("comparison-line-chart","Student_Comparison_Line"),className:"flex items-center justify-center p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md",title:"Download chart",children:e.jsx(Ue,{size:16})})]}),e.jsx("div",{children:e.jsx(Oe,{width:"100%",height:400,children:e.jsxs(Br,{data:t(),margin:{top:20,right:30,left:20,bottom:5},children:[e.jsx("defs",{children:O.map((s,c)=>{a.find(b=>b.id===s);const d=Ce[c%Ce.length];return e.jsxs("linearGradient",{id:`lineGradient-${s}`,x1:"0",y1:"0",x2:"1",y2:"0",children:[e.jsx("stop",{offset:"0%",stopColor:d,stopOpacity:.8}),e.jsx("stop",{offset:"100%",stopColor:d,stopOpacity:1})]},`lineGradient-${s}`)})}),e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2}}),e.jsx(Se,{domain:[0,100],ticks:[0,10,20,30,40,50,60,70,80,90,100],tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2},label:{value:"Percentage (%)",angle:-90,position:"insideLeft",fill:"#1a5f3f",style:{fontWeight:"bold"}}}),e.jsx(Fe,{contentStyle:{backgroundColor:"rgba(255, 255, 255, 0.95)",border:"2px solid #1a5f3f",borderRadius:"8px",boxShadow:"0 4px 6px rgba(0,0,0,0.1)"},formatter:s=>`${parseFloat(s).toFixed(1)}%`}),e.jsx(pt,{wrapperStyle:{paddingTop:"20px"}}),O.map((s,c)=>{const d=a.find(b=>b.id===s);return e.jsx(zr,{type:"monotone",dataKey:d.name,stroke:Ce[c%Ce.length],strokeWidth:3,dot:{fill:Ce[c%Ce.length],r:5,strokeWidth:2,stroke:"#fff"},activeDot:{r:7}},s)})]})})})]}),e.jsxs("div",{id:"comparison-area-chart",className:"bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-blue-100",children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsx("h2",{className:"text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent",children:"Student Comparison - Area Chart"}),e.jsx("button",{onClick:()=>xt("comparison-area-chart","Student_Comparison_Area"),className:"flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md",title:"Download chart",children:e.jsx(Ue,{size:16})})]}),e.jsx("div",{children:e.jsx(Oe,{width:"100%",height:400,children:e.jsxs(ja,{data:t(),margin:{top:20,right:30,left:20,bottom:5},children:[e.jsx("defs",{children:O.map((s,c)=>{const d=Ce[c%Ce.length];return e.jsxs("linearGradient",{id:`areaGradient-${s}`,x1:"0",y1:"0",x2:"0",y2:"1",children:[e.jsx("stop",{offset:"5%",stopColor:d,stopOpacity:.8}),e.jsx("stop",{offset:"95%",stopColor:d,stopOpacity:.1})]},`areaGradient-${s}`)})}),e.jsx(Me,{strokeDasharray:"3 3",stroke:"#e5e7eb",opacity:.5}),e.jsx($e,{dataKey:"name",tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2}}),e.jsx(Se,{domain:[0,100],ticks:[0,10,20,30,40,50,60,70,80,90,100],tick:{fill:"#1a5f3f",fontWeight:"bold"},axisLine:{stroke:"#1a5f3f",strokeWidth:2},label:{value:"Percentage (%)",angle:-90,position:"insideLeft",fill:"#1a5f3f",style:{fontWeight:"bold"}}}),e.jsx(Fe,{contentStyle:{backgroundColor:"rgba(255, 255, 255, 0.95)",border:"2px solid #1a5f3f",borderRadius:"8px",boxShadow:"0 4px 6px rgba(0,0,0,0.1)"},formatter:s=>`${parseFloat(s).toFixed(1)}%`}),e.jsx(pt,{wrapperStyle:{paddingTop:"20px"}}),O.map((s,c)=>{const d=a.find(b=>b.id===s);return e.jsx(nt,{type:"monotone",dataKey:d.name,stroke:Ce[c%Ce.length],strokeWidth:2,fill:`url(#areaGradient-${s})`,fillOpacity:.6},s)})]})})})]})]})]})})(),k==="allDetails"&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[e.jsxs("div",{className:"bg-white rounded-2xl shadow-xl p-6 border border-green-100",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-green-800 to-green-600 bg-clip-text text-transparent uppercase tracking-wider mb-4",children:"Marks Allocations for COs"}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-gradient-to-r from-green-600 to-green-700 text-white",children:[e.jsx("th",{className:"px-4 py-3 text-center font-bold border border-green-800",children:"CO"}),e.jsx("th",{className:"px-4 py-3 text-center font-bold border border-green-800",children:"Total Allocated Marks"})]})}),e.jsx("tbody",{children:C.map(t=>e.jsxs("tr",{className:"hover:bg-green-50/50",children:[e.jsx("td",{className:"px-4 py-2.5 text-sm font-bold text-gray-800 border border-gray-200 text-center bg-white",children:t}),e.jsx("td",{className:"px-4 py-2.5 text-sm text-center text-gray-700 border border-gray-200 bg-white font-bold",children:ve[t]||0})]},t))})]})})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-xl p-6 border border-blue-100",children:[e.jsx("h2",{className:"text-xl font-bold bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider mb-4",children:"Marks Allocations for POs"}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-gradient-to-r from-blue-600 to-blue-700 text-white",children:[e.jsx("th",{className:"px-4 py-3 text-center font-bold border border-blue-800",children:"PO"}),e.jsx("th",{className:"px-4 py-3 text-center font-bold border border-blue-800",children:"Total Allocated Marks"})]})}),e.jsx("tbody",{children:J.map(t=>e.jsxs("tr",{className:"hover:bg-blue-50/50",children:[e.jsx("td",{className:"px-4 py-2.5 text-sm font-bold text-gray-800 border border-gray-200 text-center bg-white",children:t}),e.jsx("td",{className:"px-4 py-2.5 text-sm text-center text-gray-700 border border-gray-200 bg-white font-bold",children:ut[t]||0})]},t))})]})})]})]}),e.jsxs("div",{className:"bg-white rounded-2xl shadow-xl p-6 border border-indigo-100",children:[e.jsxs("h2",{className:"text-xl font-bold bg-gradient-to-r from-indigo-800 to-blue-700 bg-clip-text text-transparent uppercase tracking-wider mb-4 flex items-center gap-2",children:[e.jsx(Lt,{className:"w-6 h-6 text-indigo-700"}),"Questions to COs Mapping Allocation"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-gradient-to-r from-indigo-600 to-blue-700 text-white text-xs font-bold uppercase",children:[e.jsx("th",{className:"px-6 py-3 text-left border-b border-indigo-800",children:"Assessment Component"}),e.jsx("th",{className:"px-6 py-3 text-center border-b border-indigo-800",children:"Mapped Outcome (CO)"}),e.jsx("th",{className:"px-6 py-3 text-center border-b border-indigo-800",children:"Max Marks"})]})}),e.jsx("tbody",{children:(()=>{const t=[{id:"cts",label:"Class Tests (CT)",items:o.cts||[],color:"bg-indigo-50 text-indigo-800 font-bold"},{id:"midTerm",label:"Mid Term Exam",items:o.midTerm||[],color:"bg-blue-50 text-blue-800 font-bold"},{id:"final",label:"Term Final Exam",items:o.final||[],color:"bg-cyan-50 text-cyan-800 font-bold"},{id:"assignments",label:"Assignments",items:o.assignments||[],color:"bg-emerald-50 text-emerald-800 font-bold"},{id:"others",label:"Other Evaluations",items:[]}];return o.presentation&&t[4].items.push({...o.presentation,name:"Presentation"}),o.attendance&&t[4].items.push({...o.attendance,name:"Attendance"}),o.performance&&t[4].items.push({...o.performance,name:"Performance"}),o.participation&&t[4].items.push({...o.participation,name:"Class Participation"}),o.projectReport&&t[4].items.push({...o.projectReport,name:"Project Report"}),t.map(s=>s.items.length===0?null:e.jsxs(W.Fragment,{children:[e.jsx("tr",{className:s.color,children:e.jsx("td",{colSpan:3,className:"px-6 py-2 text-sm border-b border-indigo-100",children:s.label})}),s.items.map((c,d)=>e.jsxs("tr",{className:"hover:bg-indigo-50/20 border-b border-indigo-50",children:[e.jsx("td",{className:"px-10 py-2.5 text-sm text-gray-700 font-semibold",children:c.name}),e.jsx("td",{className:"px-6 py-2.5 text-center text-sm",children:e.jsx("span",{className:"px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold",children:c.co||"N/A"})}),e.jsx("td",{className:"px-6 py-2.5 text-center text-sm font-bold text-gray-600",children:c.maxMarks})]},d))]},s.id))})()})]})})]})]}),k==="swot"&&e.jsx(wa,{courseInfo:r,calculations:S,coMarkAllocations:ve,activeCOs:C,activePOs:J,coMapping:i,targetPassMarks:m,kpiCO:l,kpiPO:h,dbCourseOutcomes:R,dbProgramOutcomes:P,coDescriptions:z,poDescriptions:U})]})]})},Aa=({value:a})=>e.jsxs("div",{className:"flex flex-col items-center justify-center h-[260px] relative",children:[e.jsxs("svg",{width:"240",height:"130",viewBox:"0 0 240 120",className:"overflow-visible",children:[e.jsx("defs",{children:e.jsxs("linearGradient",{id:"gaugeGradient",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#ef4444"}),e.jsx("stop",{offset:"50%",stopColor:"#eab308"}),e.jsx("stop",{offset:"100%",stopColor:"#22c55e"})]})}),e.jsx("path",{d:"M20 120 A 100 100 0 0 1 220 120",fill:"none",stroke:"#e2e8f0",strokeWidth:"20",strokeLinecap:"round"}),e.jsx("path",{d:"M20 120 A 100 100 0 0 1 220 120",fill:"none",stroke:"url(#gaugeGradient)",strokeWidth:"20",strokeLinecap:"round",strokeDasharray:"314.16",strokeDashoffset:314.16-314.16*(a/100)}),e.jsxs("g",{transform:"translate(120, 120)",children:[e.jsx("line",{x1:"0",y1:"0",x2:"-80",y2:"0",stroke:"#1f2937",strokeWidth:"4",strokeLinecap:"round",transform:`rotate(${a*1.8})`}),e.jsx("circle",{cx:"0",cy:"0",r:"8",fill:"#1f2937"})]})]}),e.jsxs("div",{className:"text-center mt-4",children:[e.jsxs("span",{className:"text-3xl font-black text-gray-800",children:[a.toFixed(1),"%"]}),e.jsx("p",{className:"text-xs font-bold text-gray-500 uppercase tracking-widest mt-1",children:"Overall Batch Performance"})]})]}),ka=({title:a,courseInfo:n,targetPassMarks:o,kpiCO:i,kpiPO:r,student:m=null})=>e.jsxs("div",{className:"bg-white border-[6px] border-double border-green-800 p-8 rounded-2xl shadow-xl text-center space-y-6 max-w-4xl mx-auto my-8 print:my-0 print:border-green-800",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("h2",{className:"text-sm sm:text-base md:text-lg lg:text-xl font-black text-green-950 tracking-wider break-words uppercase",children:"Bangladesh Army International University of Science & Technology"}),e.jsx("p",{className:"text-xs font-bold text-gray-500 uppercase tracking-widest",children:"Department of Computer Science and Engineering"})]}),e.jsx("div",{className:"w-20 h-1 bg-yellow-500 mx-auto my-3"}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("h1",{className:"text-3.5xl font-black text-green-900 uppercase leading-snug break-words",children:a}),e.jsx("p",{className:"text-sm font-bold text-gray-600",children:"Outcome Based Education (OBE) Assessment Report"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 max-w-2xl mx-auto border-t border-b border-green-800 py-5 text-left font-medium text-gray-700 bg-green-50/10 px-6 rounded-xl",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] text-gray-400 font-bold uppercase",children:"Course Code"}),e.jsx("p",{className:"text-green-900 break-words text-xs sm:text-sm md:text-base font-bold",children:n.courseCode||"N/A"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] text-gray-400 font-bold uppercase",children:"Course Title"}),e.jsx("p",{className:"text-green-900 break-words whitespace-normal text-xs sm:text-sm md:text-base font-bold",title:n.courseTitle,children:n.courseTitle||"N/A"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] text-gray-400 font-bold uppercase",children:"Batch & Section"}),e.jsxs("p",{className:"text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold",children:[n.batchName||"N/A"," ",n.sectionName?`(Sec: ${n.sectionName})`:""]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] text-gray-400 font-bold uppercase",children:"Academic Session"}),e.jsx("p",{className:"text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold",children:n.semesterName&&n.academicYear&&n.semesterName.includes(String(n.academicYear))?n.semesterName:`${n.semesterName||"N/A"}${n.academicYear?` (${n.academicYear})`:""}`})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] text-gray-400 font-bold uppercase",children:"Course Instructor"}),e.jsx("p",{className:"text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold",children:n.teacherName||"N/A"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-[10px] text-gray-400 font-bold uppercase",children:"Generation Date"}),e.jsx("p",{className:"text-gray-800 break-words text-xs sm:text-sm md:text-base font-bold",children:(()=>{const l=new Date;return l.toLocaleDateString("en-GB",{day:"numeric",month:"long"})+", "+l.getFullYear()})()})]}),m&&e.jsxs("div",{className:"col-span-2 border-t border-green-200 pt-3 mt-1",children:[e.jsx("p",{className:"text-[10px] text-gray-400 font-bold uppercase",children:"Student Profile"}),e.jsxs("p",{className:"text-green-900 break-words text-xs sm:text-sm md:text-base font-black",children:[m.name," (",m.id,")"]})]})]}),e.jsxs("div",{className:"pt-2 text-[10px] text-gray-500 font-bold space-x-4",children:[e.jsxs("span",{children:["Target Pass Marks: ",e.jsxs("strong",{children:[o,"%"]})]}),e.jsxs("span",{children:["CO KPI Target: ",e.jsxs("strong",{children:[i,"%"]})]}),e.jsxs("span",{children:["PO KPI Target: ",e.jsxs("strong",{children:[r,"%"]})]})]})]});export{Ma as default};
