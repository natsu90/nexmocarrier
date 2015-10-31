angular.module('starter.services', [])

.factory('DBA', function($cordovaSQLite, $q) {
  var self = this, db = null;
 
  if(window.cordova) {
    // App syntax
    db = $cordovaSQLite.openDB("myapp.db");
  } else {
    // Ionic serve syntax
    db = window.openDatabase("myapp.db", "1.0", "My app", -1);
  }
  // Handle query's and potential errors
  self.query = function (query, parameters) {
    parameters = parameters || [];
    var q = $q.defer();
 
    $cordovaSQLite.execute(db, query, parameters)
      .then(function (result) {
        q.resolve(result);
      }, function (error) {
        console.warn('I found an error');
        console.warn(error);
        q.reject(error);
      });
    return q.promise;
  }
 
  // Proces a result set
  self.getAll = function(result) {
    var output = [];
 
    for (var i = 0; i < result.rows.length; i++) {
      output.push(result.rows.item(i));
    }
    return output;
  }
 
  // Proces a single result
  self.getById = function(result) {
    var output = null;
    output = angular.copy(result.rows.item(0));
    return output;
  }
 
  return self;
})

.factory('Contacts', function($q, DBA) {
  var self = this;

  String.prototype.hashCode = function() {
    var hash = 0, i, chr, len;
    if (this.length == 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  self.init = function() {
    return DBA.query('DROP TABLE IF EXISTS Contacts').then(function() {
      return DBA.query("CREATE TABLE IF NOT EXISTS Contacts (id integer primary key, "+
        "name text, number text, cid integer, uid text, "+
        "checked int default 0, country_code text, carrier_name text, number_type text)");
    });
  }

  self.fetch = function() {
    var contacts_data = [], 
        q = $q.defer();

    navigator.contactsPhoneNumbers.list(function(contacts) {
      for (var i = 0; i < contacts.length; i++) {
        var contact_data = null;
        if(contacts[i].phoneNumbers.length > 0) {
          for(var j = 0; j < contacts[i].phoneNumbers.length; j++) {
            contact_data = {
              cid: contacts[i].id,
              uid: contacts[i].phoneNumbers[j].number.toString().hashCode(),
              name: contacts[i].displayName, 
              number: contacts[i].phoneNumbers[j].number
            };
            contacts_data.push(contact_data);
            DBA.query('INSERT INTO Contacts (name, number, cid, uid, checked) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM Contacts WHERE uid = ?)', 
              [contact_data.name, contact_data.number, contact_data.cid, contact_data.uid, 0, contact_data.uid]);
          }
        }
      }
      q.resolve(contacts_data);
    }, function(error) {
      q.reject(error);
    });
    return q.promise;
  }

  self.all = function(param) {
    if(typeof param == 'undefined')
      var param = {};
    if(typeof param.search == 'undefined')
      param.search = '';
    if(typeof param.limit == 'undefined')
      param.limit = 10;
    if(typeof param.page == 'undefined')
      param.page = 0;
    param.page = param.page * param.limit;
    var searchQry = '';
    if(param.search !== '')
      searchQry = "WHERE name like '%"+param.search+"%' "+
        "OR number like '%"+param.search+"%' "+
        "OR REPLACE(REPLACE(REPLACE(number, '+', ''), '-', ''), ' ', '') like '%"+param.search+"%' ";
    return DBA.query("SELECT * FROM Contacts "+searchQry+
      "ORDER BY LOWER(name) limit "+param.page+", "+param.limit)
      .then(function(result) {
        return DBA.getAll(result);
      });
  }

  self.get = function(contactId) {
    return DBA.query("SELECT * FROM Contacts WHERE id = "+contactId)
      .then(function(result) {
        return DBA.getById(result);
      });
  };

  self.mark = function(contactId, scanned) {
    var checked = 0;
    if(scanned === true)
      checked = 1;
    return DBA.query("UPDATE Contacts SET checked="+checked+" WHERE id="+contactId+" AND checked!="+checked);
  }

  self.delete = function(contactId) {
    return DBA.query("DELETE FROM Contacts WHERE id="+contactId);
  }

  self.unchecked = function() {
    return DBA.query("SELECT * FROM Contacts WHERE checked=0 ORDER BY LOWER(name) limit 10")
      .then(function(result) {
        return DBA.getAll(result);
      });
  };

  self.update = function(contactId, data) {
    return DBA.query("UPDATE Contacts SET checked=1, country_code='"+data.country_code+"', carrier_name='"+data.carrier_name+"', number_type='"+data.number_type+"' WHERE id="+contactId);
  };

  return self;
})

.factory('Chats', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'https://pbs.twimg.com/profile_images/598205061232103424/3j5HUXMY.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'https://pbs.twimg.com/profile_images/578237281384841216/R3ae1n61.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
