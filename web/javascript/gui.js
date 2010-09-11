// Initialise to an invalid team number
team = 0; /*The current team number*/

LEVEL_INFO = 0;
LEVEL_OK = 1;
LEVEL_WARN = 2;
LEVEL_ERROR = 3;
MAX_TAB_NAME_LENGTH = 8;

// Number that's incremented every time a new status message is displayed
status_num = 0;
// The ID of the status bar
status_id = "status";

// The tab bar
var tabbar = null;

// The project page
var projpage = null;

// The simulator page
var simpage = null;

// The project tab
var projtab = null;

// The edit page
var editpage = null;

// The errors tab
var errorspage = null;

// The robot log page
var robolog = null;

// The user
var user;

// The team selector
var team_selector;

// The user settings page
var settingspage = null;

// The switchboard page
var switchboardpage = null;

// The Admin page
var adminpage = null;

// The Diff page
var diffpage = null;

// The about box
var about = null;

// The initial onchange event ident connected to the tabbar
// Gets disconnected as soon as a team is selected
var tabchange_ident = null;

// onload function
addLoadEvent( function() {
	//On page load - this replaces a onload action of the body tag
	//Hook up the save file button
	connect(window, 'onbeforeunload', beforeunload);

	//hook up the keyboard shortcuts handler
	connect(document, 'onkeydown', on_doc_keydown);

	user = new User();
	var d = user.load();
	// Wait for the user information to come back
	d.addCallback( load_select_team );
	d.addErrback( function(err) {
		window.alert("Failed to get user info: " + err);
	} );
});

// 1) executed after the user's information has been acquired
function load_select_team() {
	// Got the user information -- now get team information
	team_selector = new TeamSelector();

	projpage = new ProjPage();
	connect( team_selector, "onchange", bind(projpage.set_team, projpage) );
	tabchange_ident = connect( team_selector, "onchange", load_gui );

	// Triggers the signals from the team selector
	team_selector.load();
}

// 2) Executed once we have team
function load_gui() {
	logDebug( "load_gui" );
	// We don't want this function to be called again
	disconnect( tabchange_ident );

	tabbar = new TabBar();

	// Edit page
	editpage = new EditPage();

	// About Box
	about = new AboutBox();

	//The switchboard page - this must happen before populate_shortcuts_box is called
	switchboardpage = new Switchboard();

	//The switchboard page - this must happen before populate_shortcuts_box is called
	settingspage = new SettingsPage();

	//The Admin page - this must happen before populate_shortcuts_box is called
	adminpage = new Admin();

	var shortcutsList = populate_shortcuts_box();

	// Shortcut button
	var shortcuts = new dropDownBox("dropShortcuts", shortcutsList);
	var sbutton = new Tab( "v", {can_close:false,title:'See more options'} ); // TODO: find something like this
	sbutton.can_focus = false;
	connect( sbutton, "onclick", function(){shortcuts.toggleBox();} ) ;
	removeElementClass(sbutton._a ,"nofocus"); /* remove nofocus class */
	addElementClass(sbutton._a ,"shortcutButton"); /* add its own class so it can be styled individually */
	tabbar.add_tab( sbutton );

	// Projects tab
	projtab = new Tab( "Projects", {can_close:false} );
	connect( projtab, "onfocus", bind( projpage.show, projpage ) );
	connect( projtab, "onblur", bind( projpage.hide, projpage ) );
	tabbar.add_tab( projtab );

	// Simulator tab
	//simpage = new SimPage();

	// Diff Page
	diffpage = new DiffPage();

	// Errors Tab
	errorspage = new ErrorsPage();

	// Switchboard tab
	switchboardpage.init()

	robolog = new RoboLog();

	//The selection operations
	sel_operations = new ProjOps();

	tabbar.switch_to( projtab );
}

function on_doc_keydown(ev) {
	//since this call could come from EditArea we have to disregard mochikit nicities
	if(typeof ev._event == 'object')
		var e = ev._event;
	else
		var e = ev;

	var stop = false;
	if( e.altKey ) {
		switch(e.keyCode) {
			case 33://PageUp
				tabbar.prev_tab();
				stop = true;
				break;
			case 34://PageDown
				tabbar.next_tab();
				stop = true;
				break;
		}
	} else if( e.ctrlKey ) {
		switch(e.keyCode) {
			case 69://E
				projpage.clickExportProject();
				stop = true;
				break;
		}
	}
	if(stop) {
		// try to prevent the browser doing something else
		kill_event(ev);
	}
}

/* contain all these in one place:
  - we've now got things that deal with raw events
  - they only work on some events
 */
function kill_event(e) {
	if(typeof e.preventDefault == 'function')
		e.preventDefault();
	if(typeof e.stopPropagation == 'function')
		e.stopPropagation();
}

function beforeunload(e) {
	if(tabbar != null && !tabbar.close_all_tabs())
		e.confirmUnload("You should close tabs before closing this window");
}

// Create drop down list TODO: make this a generic function?
function populate_shortcuts_box() {
	var shortcuts = new Array();

	function newShortcut(name, description, callback) {
		var a = A( {"title": description}, name );
		var li = LI(null, a);
		connect( li, "onclick", callback );
		return li;
	}

	shortcuts.push(newShortcut( "Create new file",
		"Create a new file",
		bind(editpage.new_file, editpage)
	));

	shortcuts.push(newShortcut( "User settings",
		"Change user settings",
		bind(settingspage.init, settingspage)
	));

	shortcuts.push(newShortcut( "View Switchboard",
		"Messages, docs and helpful information",
		bind(switchboardpage.init, switchboardpage)
	));

	shortcuts.push(newShortcut( "About",
		"View information about the RoboIDE",
		bind(about.showBox, about)
	));

	if(user.can_admin()) {
		shortcuts.push(newShortcut( "Administration",
			"IDE Admin",
			bind(adminpage.init, adminpage)
		));
	}

	var new_ul = UL(null);
	for( var i=0; i<shortcuts.length; i++) {
		appendChildNodes(new_ul, shortcuts[i]);
	}

	return new_ul;
}

// Take id of existing hidden div to make into appearing box
function dropDownBox (id, children) {
	this._init = function(id, children) {
		this.id = $(id);
		appendChildNodes(this.id, children);
		connect( this.id, "onmouseenter", bind( this._clearTimeout, this) );	// when mouse is inside the dropbox disable timeout
		connect( this.id, "onmouseleave", bind( this.hideBox, this ) );		// when mouse leaves dropbox hide it
		connect( this.id, "onclick", bind( this.hideBox, this ) );
		this._timer = null;	// timeout for box
	}
	this.showBox = function() {	// show the box and set a timeout to make it go away
		removeElementClass( this.id, "hidden" );
		var xid = this.id;	// local to allow us to pass it inside setTimeout
		this._timer = setTimeout(function(){addElementClass(xid, "hidden");} ,1500);
	}
	this.hideBox = function() {
		addElementClass( this.id, "hidden" );
	}

	this.toggleBox = function() {
		if ( hasElementClass( this.id, "hidden" ) ) {	// is the box visible?
			this.showBox();
		} else {
			this.hideBox();
		}
	}

	this._clearTimeout = function() {
		if (this._timer) {
			clearTimeout(this._timer);
			this._timer = null;
		}
	}

	this._init(id, children);
}

// Show some info about the IDE, just the version number for now
function AboutBox() {
	this._init = function() {
		this.box = $('about-box');
		connect( this.box, "onclick", bind( this.hideBox, this ) );
		this.got_info = false;
	}
	this.get_info = function() {
		if(this.got_info)
			return;
		var d = loadJSONDoc("./info");
		d.addCallback( bind( this._got_info, this ) );
	}
	this._got_info = function(nodes) {
		var dl = createDOM('dl', {id:'about-list'});
		for(var i in nodes.info) {
			var dt = createDOM('dt', null, i+':');
			var dd = createDOM('dd', null, nodes.info[i]);
			appendChildNodes(dl, dt, dd);
		}
		swapDOM('about-list', dl);
		this.got_info = true;
	}
	this.showBox = function() {
		this.get_info();
		removeElementClass( this.box, "hidden" );
		showElement($("grey-out"));
	}
	this.hideBox = function() {
		addElementClass( this.box, "hidden" );
		hideElement($("grey-out"));
	}

	this._init();
}

// **** Status Bar ****

function status_clearclass() {
	var classes = ["status-info", "status-ok", "status-warn", "status-error"];
	var s = $(status_id);

	map( partial( removeElementClass, s ), classes );
}

// Hide the status bar
function status_hide() {
	setStyle( "status-span", {"display":"none"} );

	var s = getElement(status_id);
	status_clearclass();
}

// Show the status bar with the given message, and prepend "warning" or "error"
function status_msg( message, level ) {
	switch(level) {
	case LEVEL_WARN:
		message = [ createDOM( "STRONG", null, "Warning: " ),
			    message ];
		break;
	case LEVEL_ERROR:
		message = [ createDOM( "STRONG", null, "Error: " ),
			    message ];
		break;
	}

	return status_rich_show( message, level );
}

// Replace the status bar's content with the given DOM object
function status_rich_show( obj, level ) {
	var s = getElement(status_id);

	var o = createDOM( "SPAN", { "id" : "status-span",
				     "display" : "" }, obj );
	replaceChildNodes( status_id, o );

	status_clearclass();
	switch(level) {
	case LEVEL_INFO:
		addElementClass( s, "status-info" );
		break;
	case LEVEL_OK:
		addElementClass( s, "status-ok" );
		break;
	case LEVEL_WARN:
		addElementClass( s, "status-warn" );
		break;
	default:
	case LEVEL_ERROR:
		addElementClass( s, "status-error ");
		break;
	}

	// Give it a shake if it's not OK
	if( level > LEVEL_OK )
		shake(s);

	status_num ++;
	var close_f = partial( status_close, status_num );

	return { "close": close_f };
}

// Hide the status if message id is still displayed
function status_close(id) {
	if( status_num == id )
		status_hide();
}

function status_click() {
	status_hide();
}

// Display a status message with some options
// Args:
//    message: The message to display
//      level: The log level of the message (LOG_OK etc)
//   opt_list: An array of buttons, each of which must be an object with the following properties
//             text: The button text
//         callback: The function to call when the button is clicked.
function status_options( message, level, opt_list ) {
	var m = [ message, " -- " ]
	for( var i=0; i < opt_list.length; i++) {
		var b = A({ "href" : "#" }, opt_list[i].text );
		connect( b, "onclick", partial(function(cb) { status_click(); cb(); }, opt_list[i].callback) );
		m.push(b);
		if(i+1 < opt_list.length)
			m.push(' | ');
	}

	return status_msg( m, level );
}

// Display a status message with a button
// Args:
//    message: The message to display
//      level: The log level of the message (LOG_OK etc)
//      btext: The button text
//      bfunc: The function to call when the button is clicked.
function status_button( message, level, btext, bfunc ) {
	var b = createDOM( "A", { "href" : "#" }, btext );
	connect( b, "onclick", function() { status_click(); bfunc(); } );

	var m = [ message, " -- ", b ]

	return status_msg( m, level );
}

// The user
function User() {
	// List of team numbers
	this.teams = null;
	// Dictionary of team names (team number => name)
	this.team_names = null;
	// The user's settings
	this._settings = null;

	this._info_deferred = null;

	this.load = function() {
		// Return a deferred that fires when the data's ready
		var retd = new Deferred();

		this._check_logged_in();

		this._info_deferred = retd;
		return this._info_deferred;
	}

	this._request_info = function() {
		IDE_backend_request("user/info", {}, bind(this._got_info, this), bind(function() {
			status_button( "Failed to load user information", LEVEL_ERROR,
			               "retry", bind( this._request_info, this ) ) }, this));
	}

	this._got_info = function( info ) {
		logDebug( "Got user information" );

		this.team_names = {};
		this.teams = [];
		for( var i = 0; i < info["teams"].length; i++ ) {
			var num = info["teams"][i];
			this.team_names[num] = "Team " + num;
			this.teams.push(parseInt(num, 10));
		}

		this._settings = info["settings"];
		for( var k in this._settings ) {
			logDebug( k + " = " + this._settings[k] );
		}

		if(info["is-admin"]) {
			this.can_admin = function() { return true;};
		}

		// Connect up the logout button
		disconnectAll( "logout-button" );
		connect( "logout-button", "onclick", bind( this._logout_click, this ) );

 		this._info_deferred.callback(null);
	}

	this.get_setting = function(sname) {
		return this._settings[sname];
	}

	// Check if we're logged in
	this._check_logged_in = function() {
		if (IDE_authed()) {
			this._request_info();
		} else {
			this._show_login();
		}
	}

	// Show the login dialog
	this._show_login = function() {
		status_id = "login-feedback";

		// Connect up the onclick event to the login button
		disconnectAll( "login-button" );
		connect( "login-button", "onclick", bind( this._do_login, this ) );

		// Do stuff when the user presses enter
		disconnectAll( "password" );
		connect( "password", "onkeydown", bind( this._pwd_on_keypress, this ) );

		// Show the dialog and hide the top bar, which IE6 has problems with
		setStyle( "login-back", {"display":"block"} );
		setStyle( "top", {"display":"none"} );

		//clear box on focus, replace with 'username' on blur.
		connect("username","onfocus",function(){if ($("username").value==$("username").defaultValue) $("username").value=''});
		connect("username","onblur",function(){if (!$("username").value) $("username").value = $("username").defaultValue});
		//and focus the username
		$("username").focus();
	}

	// Hide the login dialog
	this._hide_login = function() {
		status_id = "status";
		setStyle( "login-back", {"display" :"none"} );
		setStyle( "top", {"display":""} );
	}

	this._login_complete = function() {
		this._hide_login();
		this._request_info();
	}

	// Grab the username and password from the login form and start the login
	this._do_login = function(ev) {
		if( ev != null ) {
			ev.preventDefault();
			ev.stopPropagation();
		}

		var user = $("username").value;
		var pass = $("password").value;

		IDE_backend_request("auth/authenticate", {username: user, password: pass}, bind(this._login_complete, this),
		bind(function(errcode, errmsg) {
			status_msg(errmsg, LEVEL_WARN);
			$("password").value = '';
			$("password").focus();
		}, this));
	}

	this._logout_click = function(ev) {
		if( ev != null ) {
			ev.preventDefault();
			ev.stopPropagation();
		}

		IDE_backend_request("auth/deauthenticate", {},
		                    bind(window.location.reload, window.location),
		                    bind(function() {
		                                     status_button( "Failed to log out", LEVEL_ERROR, "retry",
		                                                    bind( this._logout_click, this, null )
		                                                  );
		                                    },
                            this));
	}

	// do they have admin priviledges - this gets overwirtten by the info collecter if they do
	this.can_admin = function() {
		return false;
	}

	// Do the login if they press enter in the password box
	this._pwd_on_keypress = function(ev) {
		if ( ev.key()["string"] == "KEY_ENTER" )
			this._do_login( null );
	}

};

function TeamSelector() {
	this._prompt = null;

	this.load = function() {
		var teambox = [];

		if( user.teams.length == 1 )
			team = user.teams[0];
		else
		{
			var olist = [];

			if( !this._team_exists(team) ) {
				// Work out what team we should be in
				var team_last = user.get_setting("team.last");
				if( team_last != undefined
				    && this._team_exists( team_last ) ) {
					team = team_last;
					logDebug( "Defaulting to team " + team );
				}
			}

			olist = this._build_options();

			if( !this._team_exists(team) ) {
				// Add a "please select a team" option
				olist.unshift( OPTION( { "id" : "teamlist-tmpitem",
							 "selected" : "selected" },
						       "Please select a team." ) );

				this._prompt = status_msg( "Please select a team", LEVEL_INFO );
			}

			var tsel = SELECT( null, olist );

			connect( tsel, "onchange", bind( this._selected, this ) );
			teambox.push( "Team: " );
			teambox.push( tsel );
		}

		// Span to hold the team name
		var tname = SPAN( { "id" : "teamname" }, null );
		teambox.push( tname );

		replaceChildNodes( $("teaminfo"), teambox );
		this._update_name();

		if( this._team_exists(team) )
			signal( this, "onchange", team );
	}

	this._build_options = function() {
		var olist = [];

		for( t in user.teams ) {
			var props = { "value" : user.teams[t]};

			if( user.teams[t] == team )
				props["selected"] = "selected";

			olist.push( OPTION(props, user.teams[t]) );
		}

		return olist;
	}

	// Returns true if the given team number exists for this user
	this._team_exists = function(team) {
		if( team == 0 )
			return false;

		for( i in user.teams )
			if( user.teams[i] == team )
				return true;
		return false;
	}

	this._selected = function(ev) {
		if( this._prompt != null ) {
			this._prompt.close();
			this._prompt = null;
		}

		var src = ev.src();

		//if it's not changed (webkit does weirdness)
		if(src.value == team)
			return;

		//close tabs from other teams before changing
		log('Team changed - closing all tabs');
		if(tabbar != null && !tabbar.close_all_tabs()) {
			src.value = team;
			alert('Open files must be closed before changing teams');
			return;
		}

		// Remove the "please select a team" item from the list
		var tmpitem = $("teamlist-tmpitem");
		if( tmpitem != null && src != tmpitem )
			removeElement( tmpitem );

		team = parseInt(src.value, 10);
		logDebug( "team changed to " + team );
		this._update_name();

		signal( this, "onchange", team );
	}

	this._update_name = function() {
		var name = "";
		if( this._team_exists(team) ) {
			name = user.team_names[ team ];

			if( user.teams.length == 1 )
				name = "Team " + team + ": " + name
		}

		replaceChildNodes( $("teamname"), " " + name );
	}
}


// Count of outstanding asynchronous requests
var async_count = 0;

function postJSONDoc( url, qa ) {
	alert("did a postJSONDoc: " + url);
	async_count += 1;
	showElement( $("rotating-box") );

	var d = new Deferred();
	var r;

	if( qa == undefined ) {	//it shouldn't ever be, but if that's what they want...
		r = doXHR( url );
	} else {	//throw in some defaults, then run the call
		qa.method = 'post';
		qa.headers = {"Content-Type":"application/x-www-form-urlencoded"};
		qa.sendContent = queryString(qa.sendContent);
		r = doXHR( url, qa );
	}

	r.addCallback( partial( load_postedJSONDoc, d, 0 ) );
	r.addErrback( partial( load_postedJSONDoc, d, 1 ) );

	return d;
}

function load_postedJSONDoc( d, fail, XHR ) {
	var res = evalJSONRequest(XHR);
	if( fail == 0 )	//success
		ide_json_cb( d, res );
	else
		ide_json_err( d, res );
}

function loadJSONDoc( url, qa ) {
	alert("did a loadJSONDoc: " + url);
	async_count += 1;
	showElement( $("rotating-box") );

	var d = new Deferred();
	var r;

	if( qa == undefined )
		r = MochiKit.Async.loadJSONDoc( url );
	else
		r = MochiKit.Async.loadJSONDoc( url, qa );

	r.addCallback( partial( ide_json_cb, d ) );
	r.addErrback( partial( ide_json_err, d ) );

	return d;
}

function ide_json_cb( d, res ) {
	async_count -= 1;

	if( async_count == 0 )
		hideElement( $("rotating-box") );

	d.callback(res);
}

function ide_json_err( def, res ) {
	async_count -= 1;

	if( async_count == 0 )
		hideElement( $("rotating-box") );

	def.errback(res);
}
