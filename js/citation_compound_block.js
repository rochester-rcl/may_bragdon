
(function ($) {



    Drupal.behaviors.may_bragdon_citation_updater = {
        attach: function (context, settings) {
            // Monkey patch Drupal.settings.islandora_paged_tei_seadragon_update_page
            // to update compound block to ensure we always get the current one.

            var old_page_update = Drupal.settings.islandora_paged_tei_seadragon_update_page;

            Drupal.settings.islandora_paged_tei_seadragon_update_page = function (pid, page_number) {


                //HACK - this will replace anything with a colon followed by a number 
                // and replace it with the current pid
                $('.tabs--primary.nav.nav-tabs li a').each(function (index, element) {
                    if ($(element).text() != "Pages") {
                        var value = $(element).attr("href");
                        var match = value.match(/\w*%3A\d*[^\/]/g);
                        $(element).attr("href", value.replace(match, encodeURIComponent(pid)));                        
                    }
                });             
                var contactTopPosition = $("#paged-tei-seadragon-viewer-tei").position().top;
                $("#paged-tei-seadragon-viewer-tei").scrollTop(0);
                // Drop out here if we are the most current request.
                if (pid === Drupal.settings.islandora_paged_tei_seadragon.current_page) {
                    return;
                }

                //run the original function
                old_page_update(pid, page_number);

                // call out to get citation information
                $.ajax({
                    url: Drupal.settings.basePath + "may_bragdon/mods/" + pid,
                    cache: false,
                    success: function (response) {
                        setCiteInfo(response);
                    },
                    error: function (response) {
                        //console.log(response);
                    }
                });
            };
        }

    };

    function getUrlParams() {
        //old_page_update(pid, page_number);
        // get the url parameters
        (function () {
            var match,
                    pl = /\+/g, // Regex for replacing addition symbol with a space
                    search = /([^&=]+)=?([^&]*)/g,
                    decode = function (s) {
                        return decodeURIComponent(s.replace(pl, " "));
                    },
                    query = window.location.search.substring(1);

            urlParams = {};
            while (match = search.exec(query))
                urlParams[decode(match[1])] = decode(match[2]);
        })();

        var viewOccluded = false;
        if (urlParams && urlParams['occluded'] && urlParams['occluded'] === "true") {
            viewOccluded = true;
        }

        var readerView = false;
        if (urlParams && urlParams['readerView'] && urlParams['readerView'] === "true") {
            readerView = true;
        }
        return {readerView: readerView, viewOccluded: viewOccluded};
    }
    
    function setCiteInfo(response) {
        var title = "";
        var nameArray = "";
        var firstName = "";
        var lastName = "";
        var pageNum = "";
        var retrivedFrom = window.location.href;
        var createdDate = "";
        var today = new Date();
        var date = today.getDate();
        var month = today.getMonth();
        var year = today.getFullYear();
        var mlaMonthNames = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

        if (response.mods !== null && response.mods.Page !== null) {
            //console.log("we have 10 page");
            //$('#citation_page_number').html(response.mods.Page[0]);
            title = response.mods.Title[1];
            nameArray = response.mods.Name[0];
            nameArray = nameArray.split(',');
            firstName = nameArray[1];
            lastName = nameArray[0];
            pageNum = response.mods.Page[0];
            if( response.mods.Date && response.mods.Date[0]){
                createdDate = response.mods.Date[0];
            }
            
            $('#apaStyle').html(lastName + ", " + firstName.substring(1, 2) + ". (" + createdDate.substring(0, 4) + "). <i>" + title + "</i>. Retrieved from " + retrivedFrom);
            $('#mlaStyle').html(lastName + ", " + firstName.replace(/\s+/g, '') + ". <i>" + title + "</i>. University of Rochester. Web.  " + mlaMonthNames[month] + " " + date + " " + year + ".");
            $('#chicagoStyle').html(lastName + ", " + firstName.replace(/\s+/g, '') + ", <i>" + title + "</i>. Rochester, NY: University of Rochester, 2016. " + retrivedFrom + ".");
            $(".diary-page-cite button").show();
        } else {
            //console.log("No page");
            $('#apaStyle').html("Not Found");
            $('#mlaStyle').html("Not Found");
            $('#chicagoStyle').html("Not Found");
            $(".diary-page-cite button").hide();
        }
    }

    //call the page load function after the first page load
    $(function () {
        //HACK - this will replace anything with a colon followed by a number 
        // and replace it with the current pid
        $('.tabs--primary.nav.nav-tabs li a').each(function (index, element) {
            if ($(element).text() != "Pages") {
                var value = $(element).attr("href");
                var match = value.match(/\w*%3A\d*[^\/]/g);
                var currentPid = $("#islandora_paged_tei_seadragon_pager").val();
                if (currentPid) {
                    $(element).attr("href", value.replace(match, encodeURIComponent(currentPid)));
                }
            }
        });
        /*
         var $occluded = $("#roch-tei-viewer-occluded");
         $occluded.click(function() {
         $occluded.after('<div class="ajax-progress ajax-progress-throbber"><div class="loader">&nbsp;</div></div>');
         });*/

        // Check if the new page has an occluded object and update the occluded
        // link display.
        var urlData = getUrlParams();
        var currentPid = $("#islandora_paged_tei_seadragon_pager").val();
        // only get occluded url if needed
        if (urlData.viewOccluded) {
            $.ajax(Drupal.settings.basePath + "islandora/object/" + currentPid + "/tei_viewer/find_occluded", {
                success: function (data, status, jqXHR) {
                    //change out manage pid if viewing occcluded
                    if (data.found && urlData.viewOccluded) {
                        //HACK - this will replace anything with a colon followed by a number 
                        // and replace it with the current pid
                        $('.tabs--primary.nav.nav-tabs li a').each(function (index, element) {
                            if ($(element).text() === "Manage") {
                                var value = $(element).attr("href");
                                var match = value.match(/\w*%3A\d*[^\/]/g);
                                var currentPid = data.pid;
                                if (currentPid) {
                                    $(element).attr("href", value.replace(match, encodeURIComponent(currentPid)));
                                }
                            }
                        });
                    }
                },
                error: function (error) {
                    console.log("error", error);
                }
            });
        }

        if ($(".openseadragon-container").length) {
            $(".openseadragon-container").css("position", "absolute");

            $('#paged-tei-seadragon-viewer-tei').css("height", "");

            // update the border color of the naviator once it is added to the
            // page
            $('.openseadragon-container').on('DOMNodeInserted', function (e) {

                if ($(e.target).is('.displayregion')) {
                    $(".displayregion").css("border", "2px solid rgb(95, 187, 255)");
                }
                if ($(e.target).is('span')) {
                    $(".navigator").css("border", "");
                    $(".navigator").css("border-bottom", " 2px solid rgb(85, 85, 85)");
                    $(".navigator").css("border-left", " 2px solid rgb(85, 85, 85)");
                }

                if ($('#inclusion-page').length) {
                    //$(".openseadragon-container").css("height", "100vh");
                    $(".openseadragon-container").css("top", "50px");
                    $("[id^=navigator-] form").css("top", "0px");
                    $(".openseadragon-container").css("bottom", "0");

                }
            });
        }

        //$("#tei-viewer-occluded").after('<div class="ajax-progress ajax-progress-throbber"><div class="loader">&nbsp;</div></div>');

        // update the page number on initial load
        if ($("#islandora_paged_tei_seadragon_pager").length) {

            var pid = $("#islandora_paged_tei_seadragon_pager").val();
            $.ajax({
                url: Drupal.settings.basePath + "may_bragdon/mods/" + pid,
                cache: false,
                success: function (response) {
                    //console.log(response);
                    setCiteInfo(response);
                },
                error: function (response) {
                    //console.log(response);
                    $(".diary-page-cite").addClass("hidden");
                }
            });

        }
    });


})(jQuery);
