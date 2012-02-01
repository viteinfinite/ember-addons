var get = Ember.get, escapeHTML = Ember.Handlebars.Utils.escapeExpression;

Ember.TitleSupport = Ember.Mixin.create({

  hasTitleSupport: true,
  title: null,
  localize: true,
  localizeOptions: null,
  escapeHTML: true,

  formattedTitle: Ember.computed(function() {
    var title = get(this, 'title');
    if (!Ember.empty(title)) {
      title = String(title);
      if (get(this, 'localize')) {
        title = Ember.String.loc(title, get(this, 'localizeOptions') || {});
      }
      if (get(this, 'escapeHTML')) {
        title = escapeHTML(title);
      }
    }
    return title;
  }).property('title', 'escapeHTML', 'localize', 'localizeOptions').cacheable()
});

Ember.TitleRenderSupport = Ember.Mixin.create({
  render: function(buffer) {
    buffer.push(get(this, 'formattedTitle'));
  },
  titleDidChange: Ember.observer(function() {
    this.rerender();
  }, 'formattedTitle')
});