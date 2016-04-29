let chai = require("chai");
let expect = require('chai').expect;
let fs = require('fs');
var uuid = require('node-uuid');

let FileSystem = require("../../src/utils/FileSystemPromise.js");

describe("FileSystemPromise unit tests", function () {
  this.timeout(2000);

  describe("and saving to file", ()=> {
    it("it should throw error when /nothing/ supplied.", ()=> {
      var test = new FileSystem();

      expect(() => {
        test.save();
      }).to.throw("filePathAndName cannot be undefined, null, or empty.");
    });

    it("it should throw error when undefined supplied.", ()=> {
      var test = new FileSystem();

      expect(() => {
        test.save(undefined, null);
      }).to.throw("filePathAndName cannot be undefined, null, or empty.");
    });

    it("it should throw error when null supplied.", ()=> {
      var test = new FileSystem();

      expect(() => {
        test.save(null, null);
      }).to.throw("filePathAndName cannot be undefined, null, or empty.");
    });

    it("it should throw error when '' supplied.", ()=> {
      var test = new FileSystem();

      expect(() => {
        test.save('', null);
      }).to.throw("filePathAndName cannot be undefined, null, or empty.");
    });

    it("it should save", (done) => {
      var test = new FileSystem();

      var filePathAndName = `./../${uuid()}.json`;

      var entity = {something: "two", peach: "old"};
      test.save(filePathAndName, entity).then(() => {
        fs.readFile(filePathAndName, "utf8", function (err, data) {

          var actual = JSON.parse(data);

          expect(entity.something).to.equal(actual.something);
          expect(entity.peach).to.equal(actual.peach);

          //console.log(err);

          fs.unlinkSync(filePathAndName);

          done();
        });
      }).catch((error)=> {
        //console.error(error);
        done();
      });
    });

    it("it should overwrite saved file", (done) => {
      var test = new FileSystem();

      var filePathAndName = `./../${uuid()}.json`;

      var entity = {something: "two", peach: "old"};

      test.save(filePathAndName, entity).then(() => {

        entity.again = true;

        //run it again
        test.save(filePathAndName, entity).then(() => {

          //now check it
          fs.readFile(filePathAndName, "utf8", function (err, data) {

            var actual = JSON.parse(data);

            expect(entity.something).to.equal(actual.something);
            expect(entity.peach).to.equal(actual.peach);
            expect(entity.again).to.equal(true);

            //console.log(err);

            fs.unlinkSync(filePathAndName);
            done();
          });
        });
      }).catch((error)=> {
        //console.error(error);
        done();
      });
    });
  });

  describe("and getting file", () => {
    describe("and no file", () => {
      it("it should return null", (done) => {
        var filePathAndName = `./../${uuid()}.json`;
        var test = new FileSystem();

        test.get(filePathAndName).then((data) => {

          //console.log(data);
          expect(data).to.be.null;

          done();
        }).catch((error) => {
          expect(error).to.be.null;
          done();
        });
      });

      describe("and file exits with serializing to object true", function () {
        let filePathAndName = null;
        let t = null;

        beforeEach((done) => {
          filePathAndName = `./../${uuid()}.json`;

          t = {};
          t.name = uuid();
          t.id = uuid();
          t.uri = "http://blah/" + t.id;

          var data2 = JSON.stringify(t);

          // saving file for test
          fs.writeFile(filePathAndName, data2, "utf8", (err, data) => {
            if (err) {
              console.error(err);
            }

            done();
          });
        });

        afterEach((done) => {
          t = null;
          fs.unlink(filePathAndName, (err, data) => {

            if (err) {
              console.error(err);
            }

            done();
          });
        });

        it("it should get file and serialized to object", (done) => {
          var test = new FileSystem();

          // act: get the created folder
          test.get(filePathAndName).then((data) => {
            expect(data.id).to.equal(t.id);
            expect(data.name).to.equal(t.name);

            //console.log(t);
            //console.log(data);

            done();
          }).catch((error) => {
            expect(error).to.be.null;
            done();
          });

        });

        it("it should get file and serialized to string", (done) => {
          var test = new FileSystem();

          // act: get the created folder
          test.get(filePathAndName, false).then((data) => {
            expect(data).to.equal(JSON.stringify(t));

            //console.log(t);
            //console.log(data);

            done();
          }).catch((error) => {
            expect(error).to.be.null;
            done();
          });

        });
      });
    });

    describe("and checking if file exists by supplying a file and its location", () => {
      describe("and file is undefined", () => {
        it("it should be false", (done)=> {
          var test = new FileSystem();
          test.fileSystemObjectExists(undefined)
            .then((doesExist)=> {
              expect(doesExist).to.equal(false);
              done();
            }).catch((error)=> {
            expect(error).to.be.null;
            done();
          });
        });
      });

      describe("and file is null", () => {
        it("it should be false", (done)=> {
          var test = new FileSystem();
          test.fileSystemObjectExists(null)
            .then((doesExist)=> {
              expect(doesExist).to.equal(false);
              done();
            }).catch((error)=> {
            expect(error).to.be.null;
            done();
          });
        });
      });

      describe("and file is empty string", () => {
        it("it should be false", (done)=> {
          var test = new FileSystem();
          test.fileSystemObjectExists("")
            .then((doesExist)=> {
              expect(doesExist).to.equal(false);
              done();
            }).catch((error)=> {
            expect(error).to.be.null;
            done();
          });
        });
      });

      describe("and path with file info is populated", () => {
        describe("and file does not exist", () => {
          it("it should return false", (done) => {
            var test = new FileSystem();
            var filePathAndName = `./fileShouldNotExist${uuid()}.fbo`;
            //console.log(filePathAndName);
            test.fileSystemObjectExists(filePathAndName).then((exists) => {
              expect(exists).to.equal(false);
              done();
            }).catch((error) => {
              expect(error).to.be.null;
              done();
            });
          });
        });

        describe("and file does exist", () => {
          it("it should return false", (done) => {
            var test = new FileSystem();
            var filePathAndName = `./fileDoesExist${uuid()}.ed`;

            test.save(filePathAndName, {data: true}).then(()=> {
              test.fileSystemObjectExists(filePathAndName).then((exists) => {
                //console.log(exists);
                expect(exists).to.equal(true);

                fs.unlinkSync(filePathAndName);

                done();
              }).catch((error) => {
                //console.error(error);
                fs.unlinkSync(filePathAndName);

                expect(error).to.be.null;
                done();
              });
            }).catch((error) => {
              //console.error(error);
              expect(error).to.be.null;
              done();
            });
          });
        });
      });
    });

    describe("when deleting using filesystem", () => {
      it("and file exists", (done) => {
        var test = new FileSystem();

        var filePathAndName = `./../${uuid()}.json`;

        var entity = {something: "two", peach: "old"};

        test.save(filePathAndName, entity).then(() => {

          entity.again = true;

          //run it again
          test.deleteFileSystemObject(filePathAndName).then(() => {
            //now check it
            test.fileSystemObjectExists(filePathAndName).then((exists)=> {
              //console.log(exists);
              expect(exists).to.equal(false);
              done();
            }).catch((error)=> {
              //console.error(error);
              expect(error).to.be.null;
              done();
            });
          }).catch((error)=> {
            //console.error(error);
            expect(error).to.be.null;
            done();
          });
        });
      });

      it("and file does not exists", (done) => {
        var test = new FileSystem();

        var filePathAndName = `./../${uuid()}-${uuid()}.json`;

        test.deleteFileSystemObject(filePathAndName).then(() => {
          //now check it
          test.fileSystemObjectExists(filePathAndName).then((exists)=> {
            //console.log(exists);
            expect(exists).to.equal(false);
            done();
          }).catch((error)=> {
            //console.error(error);
            expect(error).to.be.null;
            done();
          });
        }).catch((error)=> {
          //console.error(error);
          expect(error).to.be.null;
          done();
        });
      });

      it("and file does not exists", (done) => {
        var test = new FileSystem();

        var filePathAndName = `./../DeleteShouldNotExist${uuid()}.json`;

        try {
          test.deleteFileSystemObject(filePathAndName).then((result) => {
            //now check it
            expect(result).to.equal(true);
            done();
          }).catch((error)=> {
            //console.error(error);
            expect(error).to.be.null;
            done();
          });
        }
        catch (error) {
          expect(error).to.be.null;
        }
      });
    });
  });
});
