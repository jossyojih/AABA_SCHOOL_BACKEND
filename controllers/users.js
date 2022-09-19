const User = require('../models/user')
const Student = require('../models/stdDetails')
const Result = require('../models/result')
const Books = require('../models/bookList')
const Attendance = require('../models/attendance')
const requireLogin = require('../middleware/requireLogin')
const bcrypt = require('bcryptjs')
const TermStart = require('../models/termStart')
const Subjects = require('../models/subject')

// Get List of students by class
exports.student_list = async (req, res) => {

    try {
        const request = await Student.find({ stdClass: req.params.stdClass })
            .populate('user', "_id username ")

        res.json(request)
    } catch (error) {
        console.log(error)
    }

}
// Get List of Books by class
exports.book_list = async (req, res) => {

    try {
        const request = await Books.find({ bookClass: req.params.bookClass })

        res.json(request)
    } catch (error) {
        console.log(error)
    }

}


// Get Student Subjects by Section
exports.student_subjects = async (req, res) => {

    try {
        const request = await Subjects.findOne({ section: req.params.section })
        res.json(request)
    } catch (error) {
        console.log(error)
    }

}

// single student Info
exports.get_single_student = async (req, res) => {

    try {
        const student = await Student.findOne({ _id: req.params.id })
            .populate('user', "_id username ")

        res.json({ student });
    } catch (error) {
        console.log(error)
    }
}

// get single student result
exports.student_result = async (req, res) => {

    try {

        if (req.user.role !== 'student') {

            const termStart = await TermStart.findOne({})
            const result = await Result.findOne({ studentDetails: req.params.id, year: req.calendar.year, term: req.calendar.term })
          
            if (!result) return res.status(422).json({ error: 'This student has no result for this term yet' })
            const stdDetails = await Student.findById(req.params.id)
                .populate('user', "_id username")
            return res.status(200).json({ stdDetails, termStart, result })
        } else {
            // This is from the student portal
            // const termStart = await TermStart.findOne({})

            const result = await Result.findOne({ studentDetails: req.params.id, year: req.calendar.year, term: req.calendar.term })

            // No Result Image has been uploaded for this student
            if (!result || !result.resultImage) return res.status(422).json({ error: 'This student has no result for this term yet' })

            // Result Image has been uploaded for this student

            res.status(200).json({ result })

        }

    } catch (error) {
        console.log(error)
    }


}

// get Class Broad
exports.class_broad_sheet = async (req, res) => {
    try {

        const broad = await Result.find({ class: req.params.class, year: req.calendar.year, term: req.calendar.term })
            .populate('studentDetails', "_id firstname lastname sex section stdClass")


        res.json({ broad })

    } catch (error) {
        console.log(error)
    }
}

// update Student Result
exports.student_compute_result_update = async (req, res) => {
    const { data } = req.body

    try {
        const result = await Result.findByIdAndUpdate(req.params.id, data, {
            new: true
        })

        res.json({ result, message: 'Result updated Successfully' })

    } catch (error) {
        console.log(error)
    }

}

// Get A Student Book List
exports.student_books = async (req, res) => {
    

    try {
        const studentBooks = await Student.findOne({ _id: req.params.id })
            .select("id firstname middlename lastname section stdClass bookList")

            // This functions create a new booklist for a student
            const createNewBook = async (request)=>{
                const createStudentBookList = request.list.map(item => {

                    return {
                        author: item.author,
                        title: item.title,
                        condition: 'good'
                    }
    
                })
                const bookToUpdate = {
                    bookListDate: request.lastUpdated,
                    list: createStudentBookList
                }
                // return console.log(bookToUpdate)
                const newBookListCreated = await Student.findByIdAndUpdate(req.params.id,
                    { $set: { bookList: bookToUpdate } }, {
                    new: true
                })
                    .select("id firstname middlename lastname section stdClass bookList")
            
                return res.status(200).json(newBookListCreated);
            }

        //No book List have been created for this student 
        if (!studentBooks.bookList?.list[0]) {
            const request = await Books.findOne({ bookClass: studentBooks.stdClass })

            if (!request) return res.status(422).json({ error: "No book List Found For this student" })
            createNewBook(request)
            
        } else {
            const request = await Books.findOne({ bookClass: studentBooks.stdClass })

            if (studentBooks.bookList.bookListDate.toString() !== request.lastUpdated.toString()) {
                // Student has moved to a new class or book list has been updated
                createNewBook(request)     
                return
            }else{
                // Everything is the same
                return res.status(200).json(studentBooks);
            }
        }

    } catch (error) {
        console.log(error)
    }

}

// Get a single student Attendance

exports.student_attendance = async (req, res) => {

    try {
        const studentAttendance = await Attendance.findOne({ studentDetails:req.params.id, year: req.calendar.year,term:req.calendar.term })
         .populate('studentDetails', "_id firstname lastname stdClass ")
         if(!studentAttendance){
            const studentAttendance = new Attendance({
                year:req.calendar.year,
                term:req.calendar.term,
                studentDetails:req.params.id
    
            })
            studentAttendance.populate('studentDetails', "_id firstname lastname stdClass ").execPopulate();
            const stdAttendance = await studentAttendance.save()
           
           return  res.json({studentAttendance: stdAttendance});
         }
         res.json( {studentAttendance});

    } catch (error) {
        console.log(error)
    }

}

// Reset Users Password
exports.reset_Password = async (req, res) => {
    const { password, newPassword } = req.body


    if (!newPassword || !password) return res.status(422).json({ error: "Enter All fields" })
    if (newPassword.length < 8) return res.status(422).json({ error: "Password must be at least 8 characters long" })
    try {
        const user = await User.findOne({ _id: req.user._id })

        if (!user) {

            return res.status(422).json({ error: 'Un-Authorized' })
        }

        const passwordMatch = await bcrypt.compare(password, user.password)
        //Check if User is registered and verified
        if (passwordMatch && user.isVerified) {
            const passwordNow = await bcrypt.hash(newPassword, 12)
            await User.findByIdAndUpdate(req.user._id, {
                $set: { password: passwordNow }
            }, { new: true })

            res.json({ message: "Password Updated successfully" });
        } else {
            return res.status(422).json({ error: 'Invalid current Password' })
        }
    } catch (error) {
        console.log(error)
        return res.status(422).json({ error: 'could not update account' })
    }

}