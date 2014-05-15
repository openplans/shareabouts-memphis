/*globals _ Handlebars Backbone */

var Shareabouts = Shareabouts || {};

(function(S, $, console){
  S.CommitmentView = Backbone.View.extend({
    events: {
      'click .commitment-button': 'onCommitmentButtonClick',
      'click .cancel-link': 'onCancelLinkClick',
      'submit form': 'onCommitmentChange'
    },

    initialize: function() {
      this.collection.on('reset', this.onChange, this);
      this.collection.on('add', this.onChange, this);
      this.collection.on('remove', this.onChange, this);

      this.updateCommitment();
    },

    render: function() {
      // I don't understand why we need to redelegate the event here, but they
      // are definitely unbound after the first render.
      this.delegateEvents();

      this.$el.html(Handlebars.templates['place-detail-commitment']({
        count: this.collection.size() || '',
        user_token: this.options.userToken,
        has_committed: (this.userCommitment !== undefined),
        user_rating: this.userCommitment,
      }));

      return this;
    },

    remove: function() {
      // Nothing yet
    },

    getCommitment: function(userToken) {
      return this.collection.find(function(model) {
        return model.get('user_token') === userToken;
      });
    },

    updateCommitment: function() {
      this.userCommitment = this.getCommitment(this.options.userToken);
    },

    onChange: function() {
      this.updateCommitment();
      this.render();
    },

    onCommitmentButtonClick: function(evt) {
      S.Util.log('USER', 'place', 'commitment-btn-click', this.collection.options.placeModel.getLoggingDetails());
      this.$('form').removeClass('is-hidden');
    },

    onCancelLinkClick: function(evt) {
      evt.preventDefault();
      this.$('form').addClass('is-hidden');
    },

    onCommitmentChange: function(evt) {
      evt.preventDefault();

      var self = this,
          $form,
          attrs,
          userCommitment = this.userCommitment,
          isCreating = !userCommitment,

          buttons = this.el.getElementsByTagName('button'),
          disableButtons = function() { _.map(buttons, function(button) { button.disabled = true; }); },
          enableButtons = function() { _.map(buttons, function(button) { button.disabled = false; }); },

          logEvent = function(evtName) { S.Util.log('USER', 'place', evtName, self.collection.options.placeModel.getLoggingDetails()); };

      // Disable all the buttons while we save; they'll be enabled again on complete
      disableButtons();

      if (isCreating) {
        $form = this.$('form');
        attrs = S.Util.getAttrs($form);
        self.collection.create(attrs, {
          wait: true,
          complete: enableButtons,
          beforeSend: function(xhr) {
            // Set the silent header so that rating doesn't generate activity
            xhr.setRequestHeader('X-Shareabouts-Silent', 'true');
          },
          success: function() {
            logEvent('successfully-commit');
          },
          error: function() {
            self.getCommitment(self.options.userToken).destroy();
            alert('Oh dear. It looks like that didn\'t save.');
            logEvent('fail-to-commit');
          }
        });
      } else {
        userCommitment.destroy({
          wait: true,
          complete: enableButtons,
          success: function() {
            logEvent('successfully-uncommit');
          },
          error: function() {
            self.collection.add(userCommitment);
            alert('Oh dear. It looks like that didn\'t save.');
            logEvent('fail-to-uncommit');
          }
        });
      }
    }
  });

})(Shareabouts, jQuery, Shareabouts.Util.console);
