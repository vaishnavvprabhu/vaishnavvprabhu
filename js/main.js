var apiURL= "://map.co-creators.website/api/";
var map;
var geocoder;
var userGeoData;
var resizeTimer = false;
var zoomTimer = false;
var dragTimer = false;
var startup = true;
var currentMarker;
var markerData = [];
var markedArray = [];
var infoWindows = [];
var lang = "en";
var config;
var i18n_data;

// Initialize and add the map
function initMap() {
  // placeholder function requiered by google map
 }

function init() {
  populateLanguages()
  populateRepresentationDropdown();
  populateCategoriesTree();
  createLegend();


  var CustomMapStyles=[
    {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "saturation": "12"
            },
            {
                "lightness": "-11"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    }
]


  map = new google.maps.Map(document.getElementById("map"), {
    zoom: config.zoom,
    minZoom: config.minZoom,

    // styles: CustomMapStyles,
    center: {lat:0, lng:0}
    
  });
  // map.setOptions({ styles: config.mapstyles["hide"] });
  map.setOptions({ styles: CustomMapStyles, });
  geocoder = new google.maps.Geocoder();
  
  google.maps.event.addListenerOnce(map, 'idle', function(){
    setLocation();
  });

  google.maps.event.addListener(map, 'zoom_changed', function() {
    clearTimeout(zoomTimer);
    zoomTimer = setTimeout(function() {
      zoomTimer = false;
      plotPlaces();
    }, 250);
  })
  
  google.maps.event.addListener(map, 'dragend', function() {
    clearTimeout(dragTimer);
    dragTimer = setTimeout(function() {
      dragTimer = false;
      plotPlaces()
    }, 250);
  })
}

function hideMarkers() {
  for (var i = 0; i < markerData.length; i++ ) {
    markerData[i].setVisible(false);
  }
}

function plotPlaces() {
  removeMarkers();
  zoom = map.getZoom();
  var jtree_filters = [];
  var filter = {}
  // Show all on startup
  if (!startup) {
    var jtree_filters = $('#filtercategoriestree').jstree(true);
    filter = {categories: jtree_filters.get_selected()};
  }

  startup = false;
  var bounds = map.getBounds();
  filter.north = bounds.getNorthEast().lat();
  filter.south = bounds.getSouthWest().lat();
  filter.east = bounds.getNorthEast().lng();
  filter.west = bounds.getSouthWest().lng();
  var options = {
    type: "GET",
    url: apiURL + "persons/getpoints?",
    dataType: 'json',
    data: {extra: JSON.stringify(filter)}
  }
  $.ajax(options)
  .then (function(result){
    for (i=0; i < result.length; i++) {
      var icon = "http://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=" + i18n_data.categorydata.representation_characters[result[i].represents-1] + "|" + config.markerColors[result[i].primaryarea-1] +"|FFFFFF|FF0000"
      var isMarked = false;
      if (isMarkerSelected(result[i].id)) {
        isMarked = true;
        icon = "http://chart.googleapis.com/chart?chst=d_map_xpin_letter&chld=pin_star|" + i18n_data.categorydata.representation_characters[result[i].represents-1] + "|" + config.markerColors[result[i].primaryarea-1] +"|FFFFFF|FF0000";
      }
      var iconloc = new google.maps.LatLng(Number(result[i].geopoint.coordinates[1]), Number(result[i].geopoint.coordinates[0]));
      var newMarker = new google.maps.Marker({ 
        position: iconloc,
        map,
        title: result[i].areaname,
        icon: icon,
        subareas: result[i].subareas,
        ismarked: isMarked,
        represents: result[i].represents,
        name: result[i].name,
        street: result[i].street,
        zip: result[i].zip,
        phone: result[i].phone,
        website: result[i].website,
        notes: result[i].notes,
        primaryarea:result[i].primaryarea,
        primarysubarea:result[i].primarysubarea,
        pincolor: config.markerColors[result[i].primaryarea-1],
        personid:result[i].id
      });
      newMarker.addListener("click", function(e){
        ShowInfoWindow($(this))
      });
      if (infoWindows.length > 0) {
        if (infoWindows[0].anchor.personid === newMarker.personid) {
          ShowInfoWindow([newMarker])
        }
      }
      markerData.push(newMarker);
    }
    console.clear()
    console.log("Number of registrations:", result.length)
  })
  .fail(function(err){
    console.log(err.status);
  });
}

function ShowInfoWindow(marker) {
  removeInfoWindows();
  var lastMainarea = "";
  currentMarker = marker;
  var content = "";
  
  var primaryarea = i18n_data.categorydata.categories.data.find(el => el.id === Number(marker[0].primaryarea));
  var primarysubarea = primaryarea.children.find(el => el.id === marker[0].primaryarea + "|" + marker[0].primarysubarea);
  
  var website = marker[0].website;
  if (website !== "") {
    if(website.substring(0,4) !== "http") {
      website = "http://" + website
    }
    website = '<a href= "' + website + '" target="_blank">' + website + "</a>"
  }
  
  content = content + "<p><b>" + $.i18n('name') + ":</b> " + marker[0].name + "</p>";
  //content = content + "<p><b>" + $.i18n('street') + "</b>: "+ marker[0].street + "</p>";
  content = content + "<p><b>" + $.i18n('zip') + ":</b> " + marker[0].zip + "</p>";
  content = content + "<p><b>" + $.i18n('phone') + ":</b> " + marker[0].phone + "</p>";
  content = content + "<p><b>" + $.i18n('website') + ":</b> " + website + "</p>";
  content = content + "<p><b>" + $.i18n('about') + ":</b> " + marker[0].notes + "</p>";
  content = content + "<p></p>";
  if (currentMarker[0].ismarked) {
    content = content + "<div class='row'><input id='markerbutton' type='button' onclick='selectMarker()' value='" + $.i18n('deselect') + "'></div>";
  }
  else {
    content = content + "<div class='row'><input id='markerbutton' type='button' onclick='selectMarker()' value='" + $.i18n('select') + "'></div>";
  }
  content = content + "<hr>"
  content = content + "<p><b>" + $.i18n('primaryareas') + "</b></p>";
  content = content + "<p><span class='legendcircle' style='background-color:#" + config.markerColors[marker[0].primaryarea-1] + ";'></span> <u>" + primaryarea.text + "</u></p>";
  content = content + "<li>" + primarysubarea.text + "</li>";
  content = content + "<p></p>";
  if ( marker[0].subareas.length > 0) {
    content = content + "<p><b>" + $.i18n('seconaryareas') + "</b></p>";
    for (var i=0;i< marker[0].subareas.length;i++) {
      var primaryarea = i18n_data.categorydata.categories.data.find(el => el.id === Number(marker[0].subareas[i].mainareaid));
      var primarysubarea = primaryarea.children.find(el => el.id === marker[0].subareas[i].mainareaid + "|" + marker[0].subareas[i].subareaid);
  
      if (marker[0].subareas[i].mainareaid != lastMainarea) {
        content = content + "<p'><span class='legendcircle' style='background-color:#" + config.markerColors[marker[0].subareas[i].mainareaid-1] + ";'></span> <u>" + primaryarea.text + "</u></p>";
      }
      content = content + "<li>" + primarysubarea.text + "</li>";
      lastMainarea = marker[0].subareas[i].mainareaid;
    }
  }

  var infowindow = new google.maps.InfoWindow({
    content: "<div class='infowindow'>" + content + "</div>",
  })

  infoWindows.push(infowindow);
  infowindow.addListener('closeclick', function(e) {
    removeInfoWindows();
  });
  infowindow.open({ anchor: marker[0], map,shouldFocus: false});
}
 
function selectMarker() {
  if (currentMarker[0].ismarked) {
    currentMarker[0].ismarked = false;
    markedArray = markedArray.filter(item => item !== currentMarker[0].personid)
    $("#markerbutton").val($.i18n('select'));
    currentMarker[0].setIcon("http://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=" + i18n_data.categorydata.representation_characters[currentMarker[0].represents-1] + "|" + currentMarker[0].pincolor + "|FFFFFF|FF0000")
  }
  else {
    currentMarker[0].ismarked = true;
    markedArray.push(currentMarker[0].personid)
    $("#markerbutton").val($.i18n('deselect'));
    currentMarker[0].setIcon("http://chart.googleapis.com/chart?chst=d_map_xpin_letter&chld=pin_star|" + i18n_data.categorydata.representation_characters[currentMarker[0].represents-1] + "|" + currentMarker[0].pincolor + "|FFFFFF|FF0000")
  }
  if (markedArray.length > 0) {
    $("#send").show();
  }
  else {
    $("#send").hide();
  }
}

function setLocation() {
  $.getJSON("http://www.geoplugin.net/json.gp?jsoncallback=?",
    function (data) {
      userGeoData = data;
      var initialLocation = new google.maps.LatLng(data.geoplugin_latitude, data.geoplugin_longitude);
      map.setCenter(initialLocation);
      map.setZoom(10);
      zoom = 10;
      console.clear()
    })
  .fail(function() {
    map.setZoom(3);
    console.clear()
  });
}

function createLegend() {
  $('#legendcontent').html("")
  $.each(i18n_data.categorydata.representations.data, function(index, value){
    $('#legendcontent').append("<p class='legendtext'>" + i18n_data.categorydata.representation_characters[value.id-1] + " = " + value.name) + "</p>";
  });
  $('#legendcontent').append("<hr>");
  $.each(i18n_data.categorydata.categories.data, function(index, value){
    var typeArr=value.type.split("-")
    $('#legendcontent').append("<p class='legendtext'><span class='legendcircle' style='background-color:#" + config.markerColors[typeArr[1]-1] + "';></span> = " + value.text + "</p>");
  });
}

function populateRepresentationDropdown() {
  $("#represents").empty()
  $.each(i18n_data.categorydata.representations.data, function(index, value){
    if (value.name != null) {
      $("#represents").append('<option value="' + value.id + '">' + value.name +'</option>');
    }
  });
}

function populateLanguages() {
  $.each(config.languages, function(index, value){
    var option= "<option value='" + value.shortname + "' data-content='" + '<span class="flag-icon ' + value.icon + '"></span> ' + value.name + "'>" + value.name + "</option>"
    $("#languages").append(option);
  });
  $('#languages').selectpicker();
  $("#languages").val(lang);
  $('.selectpicker').selectpicker('refresh');
}

function populateCategoriesTree() {
  // $('#maincategoriestree')
  // .on('click', '.jstree-anchor', function (e) {
  //   $(this).jstree(true).toggle_node(e.target);
  // })
  // .jstree({
  //   checkbox: {'keep_selected_style': false},
  //   plugins : [ "checkbox", "conditionalselect", "types"],
  //   conditionalselect : function (node) {return this.is_leaf(node);},
  //   types: config.types,
  //   core: { data: {}, multiple : false, themes: {name: 'proton', responsive: true}}
  // });
  // $('#maincategoriestree').jstree(true).settings.core.data = i18n_data.categorydata.categories.data;
  // $('#maincategoriestree').jstree(true).refresh();
  
  // $('#othercategoriestree')
  // .on('click', '.jstree-anchor', function (e) {
  //     $(this).jstree(true).toggle_node(e.target);
  // })
  // .jstree({
  //   checkbox: {'keep_selected_style': false, 'three_state':false},
  //   plugins : [ "checkbox", "types"],
  //   types: config.types,
  //   core: { data: {}, multiple : true, themes: {name: 'proton', responsive: true}}
  // });
  // $('#othercategoriestree').jstree(true).settings.core.data = i18n_data.categorydata.categories.data;;
  // $('#othercategoriestree').jstree(true).refresh();
  
  $('#filtercategoriestree')
  .on('click', '.jstree-anchor', function (e) {
    if (!$(this).jstree(true).is_open($(this))) {
      $(this).jstree(true).open_node(e.target);
    }
  })
  .jstree({
    checkbox: {'keep_selected_style': false},
    plugins : [ "checkbox","types"],
    types: config.types,
    core: { data: {}, multiple : true, themes: {name: 'proton', responsive: true}}
  });
  $('#filtercategoriestree').jstree(true).settings.core.data = i18n_data.categorydata.categories.data;
  $('#filtercategoriestree').jstree(true).refresh();
}

function registerProfile(form) {
  var data = ConvertFormToJSON(form);
  var result = $('#maincategoriestree').jstree('get_selected');

  if (result.length === 0) {
    alert($.i18n('selectmainarea'));
    return;
  }
  var mainInterestArr = result[0].split("|");
  data.primaryarea = mainInterestArr[0];
  data.primarysubarea = mainInterestArr[1];
  data.secondaryareas = $('#othercategoriestree').jstree('get_selected');

  //geocoder.geocode( { address: data.street + " " + data.zip + " " + data.country}, function(results, status) {
  geocoder.geocode( { address: data.zip + " " + data.country}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      data.lat = results[0].geometry.location.lat();
      data.lng = results[0].geometry.location.lng();
      data.lang = lang
      
      callAPI("POST", "registration", "", data)
      .then(function(result) {
        alert($.i18n('emailsenttext'));
        $("#registerDialog").dialog("close");
      })
      .fail(function(err){
        alert($.i18n('alreadyregistred'));
      });
    }
    else {
      console.log("Geocode was not successful for the following reason: " + status, address);
      return false;
    }
  });
}

// function deregisterProfile(form) {
//   var data = ConvertFormToJSON(form);
//   data.lang = lang
//   callAPI("POST", "registration/deregister", "", data)
//   .then(function(result) {
//     alert($.i18n('emailsenttext'));
//     $("#deregisterDialog").dialog("close");
//   })
//   .fail(function(err){
//     alert($.i18n('cantfindsubscription'));
//   });
// }

function sendMessage(form) {
  var data = ConvertFormToJSON(form);
  data.recipients = JSON.parse(JSON.stringify(markedArray));
  data.lang = lang;
  callAPI("POST", "messages", "", data)
  .then(function(result) {
    alert($.i18n('emailsenttext'));
    $("#messageDialog").dialog("close");
  })
  .fail(function(err){
    if (err.status === 404) {
      alert($.i18n('notregistered'));
    }
    else {
      alert($.i18n('notregistred'));
    }
  });
}

// Bootstrap -------------------------------------------
$(document).ready(function(){
  $.i18n.debug = false;

  // Init dialogs
  $.extend($.ui.dialog.prototype.options, { 
    draggable: false,
    resizable: false,
    autoOpen: false,
    modal: true,
    closeText: "",
    width:'auto',
    position: {my: "top", at: "top+100", of: window}
  });

  $("#registerDialog").dialog({ title: "Register", width:'870',});
  $("#register").click(function(e) {
    $("#countryId option[countryid='" + userGeoData.geoplugin_countryCode+ "']").prop('selected', true);
    $("#countryId").change();
    $("#registerDialog").dialog("open");
  });
  
  $("#deregisterDialog").dialog({ title: "Deregister", width:'auto',});
  $("#deregister").click(function(e) {
    $("#deregisterDialog").dialog("open");
  });

  $("#messageDialog").dialog({ title: "Send invitation", width:'600'});
  $("#send").click(function(e) {
    clearAllInputs(("#sendmessage"))
    $("#messageDialog #message").val("");
    $("#messageDialog").dialog("open");
  });

  $('#stateId').bind( "change", function(e){
    e.preventDefault();
  });

  $.jstree.defaults.conditionalselect = function () { return true; };
  $.jstree.plugins.conditionalselect = function (options, parent) {
    this.activate_node = function (obj, e) {
      if(this.settings.conditionalselect.call(this, this.get_node(obj))) {
        parent.activate_node.call(this, obj, e);
      }
    };
  };

  $('#legendlink').bind( "click", function(e){
    e.preventDefault();
    $('#legendcontainer').show();
  });
  $('#closelegend').bind( "click", function(e){
    e.preventDefault();
    $('#legendcontainer').hide();
  });
   
  $('#registerprofile').bind( "submit", function(e){
    e.preventDefault();
    registerProfile($(this));
  });

  $('#registerDialog_close').bind( "click", function(e){
    e.preventDefault();
    $("#registerDialog").dialog("close");
  });

  $('#deregisterprofile').bind( "submit", function(e){
    e.preventDefault();
    deregisterProfile($(this));
  });

  $('#deregisterDialog_close').bind( "click", function(e){
    e.preventDefault();
    $("#deregisterDialog").dialog("close");
  });

  $('#sendmessage').bind( "submit", function(e){
    e.preventDefault();
    sendMessage($(this));
  });
  
  $('#messageDialog_close').bind( "click", function(e){
    e.preventDefault();
    $("#messageDialog").dialog("close");
  });

  $('#filterButton').bind( "click", function(e){
    e.preventDefault();
    document.getElementById("sidenav").style.width = "0";
    document.getElementById("map").style.marginLeft= "0";
    // wait for animation (to discover map bounds)
    setTimeout(function() {
      plotPlaces()
    }, 500);
  });

  $("#languages").bind( "change", function(e) {
    lang = $(this).val();
    $.i18n().locale = lang;
    $('body').i18n();
    $.getJSON(config.languageurl + "/" + lang + ".json", function (data) {
      i18n_data = data;
      populateCategoriesTree();
      populateRepresentationDropdown();
      createLegend();
      $("#registerDialog").dialog({title:$.i18n('register')})
      $("#deregisterDialog").dialog({title:$.i18n('deregister')})
      $("#messageDialog").dialog({title:$.i18n('sendinvitation')})
      $("#aboutlink").attr("href", i18n_data.links.aboutlink);
      $("#helplink").attr("href", i18n_data.links.helplink);
      $("#selfassessmentlink").attr("href", i18n_data.links.selfassessmentlink);
      $("#termslink").attr("href", i18n_data.links.termslink);
    });
  });  

  $(window).on('resize', function(e) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      resizeTimer = false;
      plotPlaces()
    }, 250);
  });
  
  $.getJSON("/static/config.json", function (data) {
    var language_list = {};
    var languages = [];
    config = data;

    $.each(config.languages, function(index, value){
      language_list[value.shortname] = config.languageurl + "/" +  value.shortname + '.json';
      languages.push(value.shortname)
    });

    var urlParams = new URLSearchParams(window.location.search);
    var registerParam = urlParams.get('registrationtoken');
    var unregisterParam = urlParams.get('unregistrationtoken');
    var sendmessageParam = urlParams.get('sendmessagetoken');
    var langParam = urlParams.get('lang');
    // Check if passed lanuage is handlad
    if(langParam != null) {
      lang = langParam;
      if(jQuery.inArray(lang, languages) === -1) {
        lang = "en";
      }
    }

    $.i18n().load(language_list)
    .done(function () {
      $.i18n().locale = lang;
      $('body').i18n();
      $("#registerDialog").dialog({title:$.i18n('register')})
      $("#deregisterDialog").dialog({title:$.i18n('deregister')})
      $("#messageDialog").dialog({title:$.i18n('sendinvitation')})

      $.getJSON(config.languageurl + "/" + lang + ".json", function (data) {
        i18n_data = data;
        $("#aboutlink").attr("href", i18n_data.links.aboutlink);
        $("#helplink").attr("href", i18n_data.links.helplink);
        $("#selfassessmentlink").attr("href", i18n_data.links.selfassessmentlink);
        $("#termslink").attr("href", i18n_data.links.termslink);
          init();
      
        // check if any queryparams
        if(registerParam != null) {
          var data = {registrationtoken: registerParam, lang: lang};
          callAPI("POST", "registration/confirmregistration", "", data)
          .then(function(result) {
            alert($.i18n('verified'));
            window.location.href = "/";
          })
          .fail(function(err){
            alert($.i18n('cantfindsubscription'));
            window.location.href = "/";
          });
        }
      
        if(unregisterParam != null) {
          var data = {unregistrationtoken:unregisterParam, lang: lang}
          callAPI("POST", "registration/confirmderegister", "", data)
          .then(function(result) {
            alert($.i18n('dataremoved'));
            window.location.href = "/";
          })
          .fail(function(err){
            alert($.i18n('cantfindsubscription'));
            window.location.href = "/";
          });
        }
      
        if(sendmessageParam != null) {
          var data = {sendmessagetoken: sendmessageParam, lang: lang}
          callAPI("POST", "messages/confirmsend", "", data)
          .then(function(result) {
            alert($.i18n('messagesent'));
            window.location.href = "/";
          })
          .fail(function(err){
            alert($.i18n('cantfindsmessage'));
            window.location.href = "/";
          });
        }
      });
    });
  });
});

// Helpers -------------------------------------------
function isMarkerSelected(id) {
  if (markedArray.includes(id)) {
    return true;
  }
  else {
    return false;
  }
}

function removeMarkers() {
  if (markerData) {
    for (i in markerData) {
      markerData[i].setMap(null);
    }
  }
}

function removeInfoWindows() {
  for (var i=0;i<infoWindows.length;i++) {
    infoWindows[i].close();
  }
  infoWindows = [];
}

function callAPI(type, route, conditions, payload) {
  var deferred = $.Deferred();
  var headers = {};

  if (conditions != "") {
    route = route + "?" + conditions;
  }
  var options = {type: type, url: (apiURL + route), data: payload, headers: headers }

  if(typeof payload === "object") {
    options.json = true;
  }
  return $.ajax(options);
}

function clearAllInputs(selector) {
  $(selector).find(':input').each(function() {
    if(this.type == 'checkbox' || this.type == 'radio') {
      this.checked = false;
    }
    else if(this.type == 'file'){
      var control = $(this);
      control.replaceWith( control = control.clone( true ) );
    }
    else if (this.type =='textarea') {
      $(this).text('');
    }
    else if (this.type != 'submit' && this.type != 'button' ){
      $(this).val('');
    }
  });
}

function ConvertFormToJSON(form){
  var array = $(form).serializeArray();
  var json = {};
  $.each(array, function() {
    json[this.name] = this.value || '';
  });
  return json;
}

(function ($) {
  $.fn.serialize = function (options) {
    return $.param(this.serializeArray(options));
  };

  $.fn.serializeArray = function (options) {
    var o = $.extend({
      checkboxesAsBools: false
    }, options || {});

    var rselectTextarea = /select|textarea/i;
    var rinput = /text|hidden|password|search|number/i;

    return this.map(function () {
        return this.elements ? $.makeArray(this.elements) : this;
    })
    .filter(function () {
      return this.name && !this.disabled &&
        (this.checked
        || (o.checkboxesAsBools && this.type === 'checkbox')
        || rselectTextarea.test(this.nodeName)
        || rinput.test(this.type));
    })
    .map(function (i, elem) {
      var val = $(this).val();
      return val == null ?
      null :
      $.isArray(val) ?
      $.map(val, function (val, i) {
        return { name: elem.name, value: val };
      }) :
      {
        name: elem.name,
        value: (o.checkboxesAsBools && this.type === 'checkbox') ? (this.checked ? true : false) : val
      };
    }).get();
  };
})(jQuery);

function ui_openNav() {
  document.getElementById("sidenav").style.width = "350px";
  document.getElementById("map").style.marginLeft = "350px";
 }

function ui_closeNav() {
  document.getElementById("sidenav").style.width = "0";
  document.getElementById("map").style.marginLeft= "0";
}