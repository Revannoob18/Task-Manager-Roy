/* SPA loader + router + task manager initialization */

const loaderEl = document.getElementById('loader');

function showLoader(){
	if(!loaderEl) return;
	loaderEl.classList.remove('hidden');
}

function hideLoader(){
	if(!loaderEl) return;
	loaderEl.classList.add('hidden');
}

/* Simple hash-based router */
function parseRoute(){
	const hash = location.hash || '#/home';
	const m = hash.match(/^#\/?([^/?#]+)/);
	return (m && m[1]) || 'home';
}

function showView(route){
	const views = document.querySelectorAll('.view');
	views.forEach(v => {
		const r = v.dataset.route;
		if(r === route){
			v.hidden = false;
			v.setAttribute('aria-current','true');
			v.style.pointerEvents = 'auto';
		} else {
			v.hidden = true;
			v.removeAttribute('aria-current');
			v.style.pointerEvents = 'none';
		}
	});
	// update nav active state
	document.querySelectorAll('.nav a[data-link]').forEach(a => {
		const href = a.getAttribute('href') || '';
		const linkRoute = href.replace('#/','').replace('#','');
		if(linkRoute === route) a.classList.add('active'); else a.classList.remove('active');
	});
	// smooth-scroll to the shown view, accounting for sticky header
	scrollToView(route);
}

function scrollToView(route){
	const el = document.querySelector(`.view[data-route="${route}"]`);
	if(!el) return;
	// allow rendering/layout to settle
	requestAnimationFrame(()=>{
		const header = document.querySelector('.site-header');
		const headerH = header ? header.getBoundingClientRect().height : 0;
		const rect = el.getBoundingClientRect();
		const top = window.scrollY + rect.top - headerH - 12; // small gap
		window.scrollTo({top: Math.max(0, top), behavior: 'smooth'});
	});
}

function routeFromHash(){
	const route = parseRoute();
	showView(route);
}

function initRouter(){
	// header and mobile nav toggle
	const headerEl = document.querySelector('.site-header');
	const navToggle = document.querySelector('.nav-toggle');
	if(navToggle && headerEl){
		navToggle.addEventListener('click', ()=>{
			const opened = headerEl.classList.toggle('nav-open');
			navToggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
		});
	}
	// intercept clicks on links with [data-link]
	document.body.addEventListener('click', e => {
		const a = e.target.closest && e.target.closest('a[data-link]');
		if(!a) return;
		e.preventDefault();
		const href = a.getAttribute('href');
		if(href){
			// close mobile nav when a link is clicked
			if(headerEl && headerEl.classList.contains('nav-open')){
				headerEl.classList.remove('nav-open');
				if(navToggle) navToggle.setAttribute('aria-expanded','false');
			}
			location.hash = href;
		}
	});
	window.addEventListener('hashchange', routeFromHash);
	// initial route
	routeFromHash();
}

/* Task manager (initialized after loader) */
function initTaskApp(){
	const form = document.getElementById('task-form');
	const input = document.getElementById('task-input');
	const list = document.getElementById('task-list');
	const empty = document.getElementById('empty');
	const filters = document.querySelectorAll('.filters button');
	const search = document.getElementById('search');

	let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
	let activeFilter = 'all';

	function save(){ localStorage.setItem('tasks', JSON.stringify(tasks)); }

	function burstConfetti(x = window.innerWidth/2, y = window.innerHeight/3){
		const colors = ['#60a5fa','#5eead4','#f472b6','#fde68a','#60a5fa'];
		const count = 16;
		for(let i=0;i<count;i++){
			const el = document.createElement('div');
			el.className = 'confetti-piece';
			el.style.left = (x + (Math.random()-0.5)*80) + 'px';
			el.style.top = (y + (Math.random()-0.5)*30) + 'px';
			el.style.background = colors[Math.floor(Math.random()*colors.length)];
			el.style.transform = `translate3d(0,0,0) rotate(${Math.random()*360}deg)`;
			document.body.appendChild(el);
			// remove after animation
			setTimeout(()=> el.remove(), 950);
		}
	}

	function makeIcon(name){ return `<svg aria-hidden="true"><use href="#icon-${name}"></use></svg>` }

	function render(){
		list.innerHTML = '';
		const q = (search && search.value || '').toLowerCase();
		const filtered = tasks.filter(t => {
			if(activeFilter === 'active') return !t.done;
			if(activeFilter === 'completed') return t.done;
			return true;
		}).filter(t => t.text.toLowerCase().includes(q));

		if(filtered.length === 0){ empty.style.display = 'block'; } else { empty.style.display = 'none'; }

		filtered.forEach(t => {
			const li = document.createElement('li');
			li.className = 'task-item';

			const left = document.createElement('div');
			left.className = 'task-left';

			const cb = document.createElement('input');
			cb.type = 'checkbox';
			cb.checked = t.done;
			cb.addEventListener('change', () => { t.done = cb.checked; save(); render(); });

			const span = document.createElement('div');
			span.className = 'task-title' + (t.done ? ' completed' : '');
			span.textContent = t.text;
			span.title = 'Double click to edit';
			span.addEventListener('dblclick', ()=> startEdit(t, span));

			left.appendChild(cb);
			left.appendChild(span);

			const actions = document.createElement('div');
			actions.className = 'task-actions';

			const edit = document.createElement('button');
			edit.className = 'icon-btn';
			edit.innerHTML = makeIcon('edit');
			edit.title = 'Edit';
			edit.addEventListener('click', ()=> startEdit(t, span));

			const del = document.createElement('button');
			del.className = 'icon-btn';
			del.innerHTML = makeIcon('trash');
			del.title = 'Hapus';
			del.addEventListener('click', ()=>{ tasks = tasks.filter(x => x.id !== t.id); save(); render(); });

			actions.appendChild(edit);
			actions.appendChild(del);

			li.appendChild(left);
			li.appendChild(actions);
			list.appendChild(li);
		});
	}

	function startEdit(task, spanEl){
		const inputEdit = document.createElement('input');
		inputEdit.type = 'text';
		inputEdit.value = task.text;
		inputEdit.className = 'task-edit-input';
		inputEdit.style.width = '100%';
		spanEl.replaceWith(inputEdit);
		inputEdit.focus();
		inputEdit.select();

		function finish(saveChange){
			const val = inputEdit.value.trim();
			if(saveChange && val){ task.text = val; save(); }
			render();
		}

		inputEdit.addEventListener('blur', () => finish(true));
		inputEdit.addEventListener('keydown', e => {
			if(e.key === 'Enter'){ finish(true); }
			if(e.key === 'Escape'){ finish(false); }
		});
	}

	if(form){
		form.addEventListener('submit', e => {
			e.preventDefault();
			const text = input.value.trim();
			if(!text) return;
			tasks.unshift({id:Date.now(), text, done:false});
			input.value = '';
			save(); render();
			// confetti near top of page
			const rect = form.getBoundingClientRect();
			burstConfetti(rect.left + rect.width/2, rect.top + rect.height/2 - 60);
		});
	}

	filters.forEach(btn => btn.addEventListener('click', ()=>{
		filters.forEach(b=>b.classList.remove('active'));
		btn.classList.add('active');
		activeFilter = btn.dataset.filter;
		render();
	}));

	if(search) search.addEventListener('input', ()=>render());

	render();
}

/* Boot sequence: show loader, then init SPA + task app */
document.addEventListener('DOMContentLoaded', ()=>{
	showLoader();
	// simulate a short loading time for effect (or replace with real resource checks)
	setTimeout(()=>{
		hideLoader();
		// initialize router and app
		initRouter();
		initTaskApp();
		// if initial route is tasks, ensure input focus
		if(parseRoute() === 'tasks'){
			const tInput = document.getElementById('task-input'); if(tInput) tInput.focus();
		}
	}, 750);
});

