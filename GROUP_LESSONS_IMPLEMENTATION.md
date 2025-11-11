# Group Lessons System Implementation

## Overview
Implemented a comprehensive group lesson system with AI-assisted student placement through demo lessons.

## Key Features

### 1. Lesson Duration Rules
- **Individual Lessons**: 60 minutes (default)
- **Group Lessons**: 
  - 1-13 students: 90 minutes
  - 14-18 students: 120 minutes (auto-adjusted via database trigger)
  - Maximum capacity: 18 students per group (enforced by database constraint)

### 2. New Database Tables

#### `lesson_groups`
Manages group lesson configurations:
- Group name, level, and teacher assignment
- Student capacity management (current/max students)
- Auto-adjusting duration based on enrollment
- Schedule (day of week + time)
- Active/inactive status

#### `group_enrollments`
Junction table tracking student group memberships:
- Links students to groups
- Enrollment status tracking
- Automatic student count updates via triggers
- Capacity enforcement (prevents over-enrollment)

#### `demo_lessons`
Tracks 30-minute demo lessons for new students:
- Student and coordinator assignment
- Detected level from demo assessment
- AI recommendations for group placement
- Coordinator notes
- Completion status and timestamps

### 3. User Role: Coordinator
New role added for demo lesson instructors who:
- Conduct 30-minute demo lessons
- Assess student levels
- Use AI recommendations to place students in appropriate groups
- Manage student enrollments

### 4. AI-Powered Group Recommendations

#### Edge Function: `recommend-group`
- Analyzes student demo performance
- Evaluates available groups for the detected level
- Considers:
  - Group capacity and current enrollment
  - Student level compatibility
  - Teacher expertise
  - Schedule availability
  - Peer group composition
- Returns ranked recommendations with confidence scores
- Fallback logic if AI credits exhausted

### 5. Updated `lessons` Table
New columns added:
- `is_group_lesson`: Boolean flag
- `group_id`: Reference to lesson_groups
- `is_demo_lesson`: Identifies demo lessons
- `demo_conducted_by`: Links to coordinator
- `duration_minutes`: Default updated to 60 minutes

### 6. UI Components

#### `/admin/group-management`
Admin interface for:
- Creating new groups
- Viewing all groups with enrollment stats
- Managing group capacity and schedules
- Activating/deactivating groups
- Real-time capacity badges (color-coded)

#### `/coordinator/demo-lessons`
Coordinator dashboard for:
- Viewing scheduled demo lessons
- Conducting assessments
- Selecting detected student level
- Getting AI group recommendations
- Enrolling students in recommended groups
- Real-time updates via Supabase realtime

### 7. Database Triggers & Functions

#### `update_group_duration()`
Automatically adjusts group duration:
- 90 minutes for 1-13 students
- 120 minutes for 14-18 students

#### `update_group_student_count()`
Maintains accurate student counts:
- Increments on enrollment
- Decrements on removal

#### `check_group_capacity()`
Prevents over-enrollment:
- Raises exception if group at max capacity
- Enforces 18-student limit

### 8. Row Level Security (RLS)
Comprehensive RLS policies:
- Students can view their own enrollments and demo lessons
- Teachers can manage their own groups
- Coordinators can conduct demos and manage enrollments
- Admins have full access
- Public can view active groups for enrollment

## Workflow

### New Student Onboarding:
1. Student signs up
2. Demo lesson scheduled (30 minutes)
3. Coordinator conducts assessment
4. System detects proficiency level
5. AI analyzes and recommends suitable groups
6. Coordinator enrolls student in chosen group
7. Student added to regular group lessons

### Group Management:
1. Admin creates groups with teacher assignments
2. System tracks enrollment in real-time
3. Duration auto-adjusts as enrollment changes
4. Capacity limits prevent over-enrollment
5. Groups can be activated/deactivated as needed

## Technical Details
- Uses Lovable AI (google/gemini-2.5-flash) for recommendations
- Real-time updates via Supabase channels
- Type-safe database operations
- Comprehensive error handling
- Fallback logic for AI failures (rate limits/credits)

## Next Steps
After migration approval:
1. Types file will regenerate
2. Components will type-check correctly  
3. Test demo lesson workflow
4. Create sample groups for each level
5. Assign coordinator role to demo instructors