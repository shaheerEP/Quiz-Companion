import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/live-quiz-companion";

if (!MONGODB_URI) {
  console.error("Please define the MONGODB_URI environment variable inside .env.local");
  process.exit(1);
}

// Minimal schemas to avoid importing complex app logic during migration
const TeacherSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, { timestamps: true });

const StudentSchema = new mongoose.Schema({ teacherId: mongoose.Schema.Types.ObjectId }, { strict: false });
const SettingsSchema = new mongoose.Schema({ teacherId: mongoose.Schema.Types.ObjectId, key: String }, { strict: false });
const SessionSchema = new mongoose.Schema({ teacherId: mongoose.Schema.Types.ObjectId }, { strict: false });
const QuestionLogSchema = new mongoose.Schema({ teacherId: mongoose.Schema.Types.ObjectId }, { strict: false });
const WithdrawalLogSchema = new mongoose.Schema({ teacherId: mongoose.Schema.Types.ObjectId }, { strict: false });

const Teacher = mongoose.models.Teacher || mongoose.model("Teacher", TeacherSchema);
const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);
const QuestionLog = mongoose.models.QuestionLog || mongoose.model("QuestionLog", QuestionLogSchema);
const WithdrawalLog = mongoose.models.WithdrawalLog || mongoose.model("WithdrawalLog", WithdrawalLogSchema);

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // 1. Create Default Teacher
    let defaultTeacher = await Teacher.findOne({ username: "default_teacher" });
    if (!defaultTeacher) {
      console.log("Creating default_teacher...");
      // For legacy login compatibility, we can just set a default password
      defaultTeacher = await Teacher.create({
        username: "default_teacher",
        password: process.env.TEACHER_PASSWORD || "admin123",
      });
    }
    const defaultTeacherId = defaultTeacher._id;
    console.log(`Default Teacher ID: ${defaultTeacherId}`);

    // 2. Migrate Students
    const studentResult = await Student.updateMany(
      { teacherId: { $exists: false } },
      { $set: { teacherId: defaultTeacherId } }
    );
    console.log(`Migrated ${studentResult.modifiedCount} Students.`);

    // 3. Migrate Settings
    const settingsResult = await Settings.updateMany(
      { teacherId: { $exists: false } },
      { $set: { teacherId: defaultTeacherId } }
    );
    console.log(`Migrated ${settingsResult.modifiedCount} Settings.`);

    // 4. Migrate Sessions
    const sessionResult = await Session.updateMany(
      { teacherId: { $exists: false } },
      { $set: { teacherId: defaultTeacherId } }
    );
    console.log(`Migrated ${sessionResult.modifiedCount} Sessions.`);

    // 5. Migrate QuestionLogs
    const qlogResult = await QuestionLog.updateMany(
      { teacherId: { $exists: false } },
      { $set: { teacherId: defaultTeacherId } }
    );
    console.log(`Migrated ${qlogResult.modifiedCount} QuestionLogs.`);

    // 6. Migrate WithdrawalLogs
    const wlogResult = await WithdrawalLog.updateMany(
      { teacherId: { $exists: false } },
      { $set: { teacherId: defaultTeacherId } }
    );
    console.log(`Migrated ${wlogResult.modifiedCount} WithdrawalLogs.`);

    // Note: To cleanly drop the old index `name_1` on Student and `key_1` on Settings,
    // we should execute db commands.
    try {
      await Student.collection.dropIndex("name_1");
      console.log("Dropped old unique index on Student.name");
    } catch (e: any) {
      console.log("Student.name index might not exist or already dropped:", e.message);
    }

    try {
      await Settings.collection.dropIndex("key_1");
      console.log("Dropped old unique index on Settings.key");
    } catch (e: any) {
      console.log("Settings.key index might not exist or already dropped:", e.message);
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
